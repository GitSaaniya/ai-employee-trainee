"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Mic, Square } from "lucide-react";
import { InterviewStatusChip, MicMeter } from "@/components/experience/mic-meter";
import { AudioDebugPanel } from "@/components/experience/audio-debug-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { Assessment, AssessmentResult, AssessmentSession, InterviewUiState } from "@/lib/types";
import {
  appendAssessmentTurn,
  completeAssessmentSession,
  getSession,
  saveAssessmentSession,
} from "@/lib/data/store";
import { audioConfig, concatFloat32, rmsToDb } from "@/lib/audio/config";
import { LiveSttClient } from "@/lib/audio/live-stt-client";
import { createTtsPlayer } from "@/lib/audio/tts-player";
import { startSileroVad } from "@/lib/audio/silero-vad";
import { evaluatePcmUtterance } from "@/lib/audio/stt-quality";
import { encodeWavFromFloat32 } from "@/lib/audio/wav";
import { ensureSituationalQuestion } from "@/lib/assessment/question-guard";
import { cn, uid } from "@/lib/utils";

export function InterviewStage({
  assessment,
  session: initialSession,
  assignmentId,
  employeeName: employeeNameProp,
}: {
  assessment: Assessment;
  session: AssessmentSession;
  assignmentId: string;
  employeeName?: string;
}) {
  const router = useRouter();
  const agentName = assessment.persona.name?.trim() || "Maya";
  const topic =
    assessment.title?.trim() ||
    assessment.audienceMetadata.productFocus?.trim() ||
    assessment.domain?.trim() ||
    "this skill";
  const employeeName =
    employeeNameProp?.trim() ||
    (typeof window !== "undefined" ? getSession()?.name?.trim() : "") ||
    "there";
  const [session, setSession] = useState(initialSession);
  const [uiState, setUiState] = useState<InterviewUiState>("ready");
  const [micLevel, setMicLevel] = useState(0);
  const [started, setStarted] = useState(false);
  const [progressLabel, setProgressLabel] = useState(
    `Q 0 / ${Math.max(assessment.coreQuestions.length, 5)}`
  );
  const [typedAnswer, setTypedAnswer] = useState("");
  const [engineLabel, setEngineLabel] = useState("initializing");
  const [vadSpeech, setVadSpeech] = useState(false);
  const [smartTurnEvent, setSmartTurnEvent] = useState("idle");
  const [showDebug, setShowDebug] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [liveCaption, setLiveCaption] = useState("");
  const [captionSpeaker, setCaptionSpeaker] = useState<"agent" | "you" | null>(null);
  const [captionPartial, setCaptionPartial] = useState(false);
  const [liveSttReady, setLiveSttReady] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(
    audioConfig.sessionTimeBoxMinutes * 60
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vadRef = useRef<Awaited<ReturnType<typeof startSileroVad>> | null>(null);
  const ttsRef = useRef(createTtsPlayer());
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const committingRef = useRef(false);
  const questionIndexRef = useRef(0);
  const followUpsRef = useRef(0);
  const awaitingFollowUpRef = useRef(false);
  const sessionIdRef = useRef(initialSession.id);
  const sileroReadyRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceChunksRef = useRef<Float32Array[]>([]);
  const utteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitFromAudioRef = useRef<(wav: Blob | null) => void>(() => undefined);
  const speakGenRef = useRef(0);
  const finishingRef = useRef(false);
  const ignoreSpeechUntilRef = useRef(0);
  const liveSttRef = useRef<LiveSttClient | null>(null);
  const liveFinalsRef = useRef<string[]>([]);
  const livePartialRef = useRef("");

  const questions = assessment.coreQuestions.map((q) => ({
    ...q,
    text: ensureSituationalQuestion(q.text, assessment.roleLabel),
  }));
  const totalQ = Math.max(questions.length, 1);

  const clearSilence = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const clearUtteranceTimer = () => {
    if (utteranceTimerRef.current) {
      clearTimeout(utteranceTimerRef.current);
      utteranceTimerRef.current = null;
    }
  };

  const clearUtteranceState = () => {
    clearUtteranceTimer();
    utteranceChunksRef.current = [];
  };

  const flushUtterance = useCallback((force = false) => {
    clearUtteranceTimer();
    const chunks = utteranceChunksRef.current;
    utteranceChunksRef.current = [];
    const hasLive =
      liveFinalsRef.current.some((s) => s.trim()) || Boolean(livePartialRef.current.trim());

    if (!chunks.length) {
      if (force && typedAnswer.trim()) {
        commitFromAudioRef.current(null);
        return;
      }
      if (hasLive) {
        setSmartTurnEvent("utterance_finalize_live");
        commitFromAudioRef.current(null);
        return;
      }
      if (force) toast.message("No speech captured — keep talking, then tap again");
      return;
    }
    const pcm = concatFloat32(chunks);
    const quality = evaluatePcmUtterance(pcm);
    if (!quality.ok) {
      setSmartTurnEvent("utterance_rejected_weak");
      if (force && typedAnswer.trim()) {
        commitFromAudioRef.current(null);
        return;
      }
      if (hasLive) {
        commitFromAudioRef.current(null);
        return;
      }
      if (force) {
        toast.message("Speech too quiet or short — try again a bit louder");
      }
      return;
    }
    const wav = encodeWavFromFloat32(pcm, 16000);
    setSmartTurnEvent("utterance_finalize");
    commitFromAudioRef.current(wav);
  }, [typedAnswer]);

  const stopMedia = useCallback(async () => {
    clearSilence();
    clearUtteranceState();
    speakGenRef.current += 1;
    ttsRef.current.stop();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    await liveSttRef.current?.stop();
    liveSttRef.current = null;
    liveFinalsRef.current = [];
    livePartialRef.current = "";
    await vadRef.current?.stop();
    vadRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const ensureLiveStt = useCallback(async () => {
    if (!streamRef.current || finishingRef.current) return;
    if (!liveSttRef.current) {
      const client = new LiveSttClient();
      client.setHandlers({
        onPartial: (text) => {
          if (!listeningRef.current) return;
          livePartialRef.current = text;
          setCaptionSpeaker("you");
          setCaptionPartial(true);
          const finals = liveFinalsRef.current.join(" ").trim();
          setLiveCaption(finals ? `${finals} ${text}` : text);
        },
        onFinal: (text) => {
          if (!listeningRef.current) return;
          livePartialRef.current = "";
          liveFinalsRef.current.push(text);
          setCaptionSpeaker("you");
          setCaptionPartial(false);
          setLiveCaption(liveFinalsRef.current.join(" ").trim());
        },
        onStatus: (status) => {
          setLiveSttReady(status === "live");
          if (status === "live") setEngineLabel("stt:gladia-live");
        },
        onError: () => {
          setLiveSttReady(false);
        },
      });
      liveSttRef.current = client;
      await client.start(streamRef.current);
    } else {
      liveSttRef.current.setListening(true);
    }
  }, []);

  const enterListening = useCallback(() => {
    if (finishingRef.current) return;
    speakingRef.current = false;
    listeningRef.current = true;
    clearUtteranceState();
    liveFinalsRef.current = [];
    livePartialRef.current = "";
    ignoreSpeechUntilRef.current = Date.now() + audioConfig.postTtsSettleMs;
    setUiState("listening");
    setCaptionSpeaker(null);
    setCaptionPartial(false);
    setLiveCaption("");
    setSmartTurnEvent("settle_after_tts");
    void vadRef.current?.start();
    window.setTimeout(() => {
      if (finishingRef.current || speakingRef.current) return;
      if (Date.now() < ignoreSpeechUntilRef.current) return;
      setSmartTurnEvent(sileroReadyRef.current ? "silero_listening" : "silence_fallback");
      void ensureLiveStt();
    }, audioConfig.postTtsSettleMs);
  }, [ensureLiveStt]);

  const speakAi = useCallback(async (text: string, followUp = false) => {
    if (finishingRef.current) return;
    const gen = ++speakGenRef.current;
    speakingRef.current = true;
    listeningRef.current = false;
    clearSilence();
    clearUtteranceState();
    liveSttRef.current?.setListening(false);
    liveFinalsRef.current = [];
    livePartialRef.current = "";
    void vadRef.current?.pause();
    setUiState("speaking");
    setSmartTurnEvent("ai_speaking");
    setCaptionSpeaker("agent");
    setCaptionPartial(false);
    setLiveCaption(text);
    if (finishingRef.current || gen !== speakGenRef.current) return;
    const updated = appendAssessmentTurn(sessionIdRef.current, {
      id: uid("turn"),
      role: "ai",
      text,
      at: new Date().toISOString(),
      followUp,
    });
    setSession(updated);

    let outcome: "ended" | "stopped" = "ended";
    try {
      const ctrl = new AbortController();
      const timeout = window.setTimeout(() => ctrl.abort(), 2200);
      const res = await fetch("/api/assessment/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      }).finally(() => window.clearTimeout(timeout));
      if (gen !== speakGenRef.current || finishingRef.current) return;
      const payload = await res.json();
      if (gen !== speakGenRef.current || finishingRef.current) return;
      if (payload.audioBase64) {
        setEngineLabel(`tts:${payload.source}`);
        outcome = await ttsRef.current.playBase64Audio(payload.audioBase64, payload.mimeType || "audio/wav");
      } else {
        if (payload.warning) toast.message(payload.warning);
        setEngineLabel("tts:browser");
        outcome = await ttsRef.current.playBrowserSpeech(text);
      }
    } catch {
      if (gen !== speakGenRef.current || finishingRef.current) return;
      setEngineLabel("tts:browser");
      outcome = await ttsRef.current.playBrowserSpeech(text);
    }

    // Aborted by barge-in / newer speak / teardown (gen bumped before stop).
    if (gen !== speakGenRef.current || finishingRef.current) return;
    // Unexpected playback stop (e.g. browser TTS onerror) — recover so the interview is not stuck.
    if (outcome === "stopped") {
      toast.message("Voice playback interrupted — listening");
      enterListening();
      return;
    }

    enterListening();
  }, [enterListening]);

  const handleBargeIn = useCallback(() => {
    if (finishingRef.current) return;
    if (!speakingRef.current && !ttsRef.current.isPlaying()) return;
    speakGenRef.current += 1;
    ttsRef.current.stop();
    speakingRef.current = false;
    setLiveCaption("");
    setUiState("interrupted");
    setSmartTurnEvent("barge_in");
    toast.message("Barge-in — listening");
    window.setTimeout(() => {
      if (finishingRef.current) return;
      enterListening();
    }, 250);
  }, [enterListening]);

  const finishInterview = useCallback(
    async (closingText?: string) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      listeningRef.current = false;
      speakingRef.current = false;
      clearSilence();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      speakGenRef.current += 1;
      ttsRef.current.stop();

      const closing =
        closingText?.trim() ||
        `${employeeName}, thanks for practicing with me today. ${agentName} will wrap up your readiness summary now.`;
      const withClose = appendAssessmentTurn(sessionIdRef.current, {
        id: uid("turn"),
        role: "ai",
        text: closing,
        at: new Date().toISOString(),
      });
      setSession(withClose);

      const gen = ++speakGenRef.current;
      speakingRef.current = true;
      setUiState("speaking");
      setLiveCaption(closing);
      try {
        const res = await fetch("/api/assessment/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: closing }),
        });
        if (gen === speakGenRef.current) {
          const payload = await res.json();
          if (payload.audioBase64) {
            await ttsRef.current.playBase64Audio(payload.audioBase64, payload.mimeType || "audio/wav");
          } else {
            await ttsRef.current.playBrowserSpeech(closing);
          }
        }
      } catch {
        if (gen === speakGenRef.current) {
          await ttsRef.current.playBrowserSpeech(closing);
        }
      }
      speakingRef.current = false;
      setLiveCaption("");

      await stopMedia();
      setUiState("thinking");

      let result: AssessmentResult | undefined;
      try {
        const res = await fetch("/api/assessment/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            assignmentId,
            employeeId: withClose.employeeId,
            assessment: {
              id: assessment.id,
              title: assessment.title,
              goal: assessment.goal,
              roleLabel: assessment.roleLabel,
              domain: assessment.domain,
              rubricSkills: assessment.rubricSkills,
            },
            turns: withClose.turns.map((t) => ({
              role: t.role,
              text: t.text,
              followUp: t.followUp,
            })),
          }),
        });
        const payload = await res.json();
        if (res.ok && payload.result) {
          result = payload.result as AssessmentResult;
          if (payload.warning) toast.message(payload.warning);
        }
      } catch {
        toast.message("Scoring fell back to Demo AI");
      }

      completeAssessmentSession(sessionIdRef.current, result);
      setUiState("complete");
      router.push(`/employee/assessments/${assignmentId}/results`);
    },
    [agentName, assessment, assignmentId, employeeName, router, stopMedia]
  );

  const transcribeAudio = useCallback(
    async (wav: Blob | null): Promise<string | null> => {
      if (typedAnswer.trim()) {
        const t = typedAnswer.trim();
        setTypedAnswer("");
        return t;
      }

      // Prefer live finals from this listening turn (enterprise: lower latency, same Gladia stack)
      const liveJoined = [...liveFinalsRef.current, livePartialRef.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ")
        .trim();
      liveFinalsRef.current = [];
      livePartialRef.current = "";
      if (liveJoined) {
        setEngineLabel("stt:gladia-live");
        return liveJoined;
      }

      if (!wav) {
        return null;
      }
      const form = new FormData();
      form.append("audio", wav, "utterance.wav");
      form.append("questionIndex", String(questionIndexRef.current));
      try {
        const res = await fetch("/api/assessment/stt", { method: "POST", body: form });
        const payload = await res.json();
        setEngineLabel(`stt:${payload.source ?? "unknown"}`);
        if (payload.rejected || !payload.text?.trim()) {
          toast.message(payload.warning || "Couldn’t catch that — please speak again");
          return null;
        }
        if (payload.warning) toast.message(payload.warning);
        return payload.text.trim() as string;
      } catch {
        toast.message("Speech recognition failed — please try again");
        return null;
      }
    },
    [typedAnswer]
  );

  const commitUserTurn = useCallback(
    async (wav: Blob | null = null) => {
      if (committingRef.current || finishingRef.current) return;
      if (!listeningRef.current) return;
      committingRef.current = true;
      listeningRef.current = false;
      clearSilence();
      setUiState("transcribing");
      setSmartTurnEvent("committed");

      const answer = await transcribeAudio(wav);
      if (finishingRef.current) {
        committingRef.current = false;
        return;
      }

      if (!answer) {
        committingRef.current = false;
        enterListening();
        return;
      }

      let updated = appendAssessmentTurn(sessionIdRef.current, {
        id: uid("turn"),
        role: "user",
        text: answer,
        at: new Date().toISOString(),
      });
      setSession(updated);
      setUiState("thinking");

      try {
        const res = await fetch("/api/assessment/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentName,
            personaName: agentName,
            employeeName,
            topic,
            goal: assessment.goal,
            roleLabel: assessment.roleLabel,
            scenario: assessment.scenario,
            learnerPersona: assessment.learnerPersona,
            adaptiveEnabled: assessment.adaptiveEnabled && !awaitingFollowUpRef.current,
            followUpsUsed: followUpsRef.current,
            maxFollowUps: 2,
            currentQuestionIndex: questionIndexRef.current,
            coreQuestions: questions.map((q) => ({ order: q.order, text: q.text })),
            transcript: updated.turns.map((t) => ({ role: t.role, text: t.text })),
            lastUserAnswer: answer,
          }),
        });
        const payload = await res.json();
        if (finishingRef.current) {
          committingRef.current = false;
          return;
        }
        if (!res.ok) throw new Error(payload.error || "Turn failed");

        if (payload.action === "follow_up") {
          followUpsRef.current += 1;
          awaitingFollowUpRef.current = true;
          updated = { ...updated, adaptiveFollowUpsUsed: followUpsRef.current };
          saveAssessmentSession(updated);
          setSession(updated);
          committingRef.current = false;
          await speakAi(payload.reply, true);
          return;
        }

        awaitingFollowUpRef.current = false;
        questionIndexRef.current += 1;
        updated = {
          ...updated,
          currentQuestionIndex: questionIndexRef.current,
          adaptiveFollowUpsUsed: followUpsRef.current,
        };
        saveAssessmentSession(updated);
        setSession(updated);
        committingRef.current = false;

        if (finishingRef.current) return;

        if (payload.action === "close" || questionIndexRef.current >= questions.length) {
          await finishInterview(payload.action === "close" ? payload.reply : undefined);
          return;
        }

        setProgressLabel(`Q ${questionIndexRef.current + 1} / ${totalQ}`);
        await speakAi(payload.reply || questions[questionIndexRef.current]?.text || "Next question.");
      } catch (e) {
        committingRef.current = false;
        if (finishingRef.current) return;
        toast.error(e instanceof Error ? e.message : "Turn failed");
        enterListening();
      }
    },
    [
      agentName,
      assessment.adaptiveEnabled,
      assessment.goal,
      assessment.learnerPersona,
      assessment.roleLabel,
      assessment.scenario,
      employeeName,
      enterListening,
      finishInterview,
      questions,
      speakAi,
      topic,
      totalQ,
      transcribeAudio,
    ]
  );

  useEffect(() => {
    commitFromAudioRef.current = (wav) => {
      void commitUserTurn(wav);
    };
  }, [commitUserTurn]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      setUiState("requesting_permissions");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }

        // Ready as soon as media works — do not block Start on Silero CDN download.
        setEngineLabel("vad:loading");
        setUiState("ready");

        const vad = await startSileroVad(
          stream,
          {
            onFrame: (rms, speech) => {
              // Light smoothing so the meter tracks speech without looking dead
              setMicLevel((prev) => (rms > prev ? rms : prev * 0.82 + rms * 0.18));
              setVadSpeech(speech);
              // Silence-fallback only prompts the learner — never invents a mock answer.
              if (listeningRef.current && !sileroReadyRef.current && rms > 0.08) {
                setUiState("turn_pending");
                clearSilence();
                silenceTimerRef.current = setTimeout(() => {
                  toast.message("Still listening — speak clearly, then pause or tap I’m done");
                  clearSilence();
                  setUiState("listening");
                }, audioConfig.silenceFallbackMs);
              }
            },
            onSpeechStart: () => {
              if (!listeningRef.current || Date.now() < ignoreSpeechUntilRef.current) return;
              // Mid-sentence pause ended — keep buffering instead of finalizing.
              clearUtteranceTimer();
              setUiState("turn_pending");
              setSmartTurnEvent("speech_start");
            },
            onSpeechEndPcm: (pcm) => {
              if (!listeningRef.current || committingRef.current) return;
              if (Date.now() < ignoreSpeechUntilRef.current) return;
              utteranceChunksRef.current.push(pcm);
              setSmartTurnEvent("speech_end_buffer");
              clearUtteranceTimer();
              utteranceTimerRef.current = setTimeout(() => {
                flushUtterance(false);
              }, audioConfig.utteranceFinalizeMs);
            },
            // PCM path handles commit after debounce; do not commit immediately here.
            onSpeechEnd: () => undefined,
            onBargeInSpeech: () => handleBargeIn(),
            onError: (err) => {
              sileroReadyRef.current = false;
              setEngineLabel("vad:fallback");
              toast.message(`Silero VAD unavailable — silence timer fallback (${err.message})`);
            },
          },
          { bargeInArmed: () => speakingRef.current }
        );

        if (cancelled) {
          await vad.stop();
          return;
        }
        vadRef.current = vad;
        sileroReadyRef.current = vad.ready;
        setEngineLabel(vad.ready ? "vad:silero" : "vad:fallback");
      } catch {
        setUiState("error");
        toast.error("Camera or microphone permission denied");
      }
    }

    void setup();
    return () => {
      cancelled = true;
      void stopMedia();
    };
  }, [flushUtterance, handleBargeIn, stopMedia]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && speakingRef.current) {
        e.preventDefault();
        handleBargeIn();
      }
      if (e.key === "d" && e.altKey) {
        setShowDebug((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBargeIn]);

  async function beginInterview() {
    if (started || finishingRef.current || uiState === "error" || uiState === "requesting_permissions") {
      if (uiState === "error") toast.error("Enable camera and microphone to continue");
      return;
    }
    if (!questions.length) {
      toast.error("This assessment has no questions. Ask an admin to run Generate first.");
      return;
    }
    setStarted(true);
    questionIndexRef.current = 0;
    followUpsRef.current = 0;
    awaitingFollowUpRef.current = false;
    finishingRef.current = false;
    setProgressLabel(`Q 1 / ${totalQ}`);

    const deadline = Date.now() + audioConfig.sessionTimeBoxMinutes * 60 * 1000;
    sessionTimerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSessionSecondsLeft(left);
      if (left <= 0) {
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        void finishInterview("We're at time — thanks for the conversation. Wrapping up your scores now.");
      }
    }, 1000);

    const q0 = questions[0];
    const role = assessment.roleLabel?.trim() || "your role";
    const opener = `Hi ${employeeName}, I'm ${agentName}. I'll assess how you handle situations as ${role}. ${q0.text}`;
    await speakAi(opener);
  }

  const rmsDb = rmsToDb(micLevel || 1e-6);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <InterviewStatusChip state={uiState} />
          <div className="flex items-center gap-3 text-sm text-white/50">
            <span>{progressLabel}</span>
            {started && (
              <span className="text-xs text-white/35">
                {Math.floor(sessionSecondsLeft / 60)}:{String(sessionSecondsLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
          {uiState === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white/70">
              Camera/microphone blocked. Allow permissions and refresh.
            </div>
          )}
          <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-2">
            {captionsOn && liveCaption && (
              <div
                className="border border-white/10 bg-black/75 px-3.5 py-2.5 backdrop-blur-md"
                aria-live="polite"
              >
                <div className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">
                  {captionSpeaker === "you" ? employeeName : agentName}
                  {captionPartial ? " · listening" : ""}
                  {liveSttReady && captionSpeaker === "you" ? " · live" : ""}
                </div>
                <p
                  className={cn(
                    "text-[13px] leading-relaxed text-white/90",
                    captionPartial && "text-white/55"
                  )}
                >
                  {liveCaption}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Mic className="h-3.5 w-3.5 text-[#00E5FF]" />
                Mic level
              </div>
              <MicMeter level={micLevel} active={uiState === "listening" || uiState === "turn_pending"} />
            </div>
          </div>
        </div>

        <AudioDebugPanel
          open={showDebug}
          rmsDb={rmsDb}
          vadSpeech={vadSpeech}
          smartTurn={smartTurnEvent}
          engine={engineLabel}
        />

        <div className="flex flex-wrap gap-2">
          {!started && uiState !== "complete" && (
            <Button
              className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white shadow-[0_0_24px_rgba(0,229,255,0.3)]"
              onClick={() => void beginInterview()}
              disabled={uiState === "requesting_permissions"}
            >
              Start interview
            </Button>
          )}
          {(uiState === "listening" || uiState === "turn_pending") && (
            <>
              <Textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Optional typed answer (overrides STT)"
                className="min-h-[72px] w-full border-white/10 bg-black/40 text-white placeholder:text-white/30"
              />
              <Button
                className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white"
                onClick={() => flushUtterance(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> I&apos;m done speaking
              </Button>
            </>
          )}
          {uiState === "speaking" && (
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={handleBargeIn}
            >
              <Square className="h-4 w-4" /> Interrupt (Space)
            </Button>
          )}
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => setCaptionsOn((v) => !v)}
            aria-pressed={captionsOn}
          >
            {captionsOn ? "Captions on" : "Captions off"}
          </Button>
        </div>
        <p className="text-xs text-white/40">
          Silero → Gladia → Groq → Sarvam when keys are set. Headphones recommended. Alt+D audio debug.
          Toggle captions for AI speech accessibility.
        </p>
      </div>

      <div className="flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-[#0d1219]/90">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-medium text-white/80">
          Live transcript
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {session.turns.length === 0 && (
            <p className="text-sm text-white/40">Press Start interview to begin.</p>
          )}
          {session.turns.map((t) => (
            <div
              key={t.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm leading-relaxed",
                t.role === "ai"
                  ? "bg-[#00E5FF]/10 text-white/90"
                  : t.role === "user"
                    ? "bg-white/10 text-white/85"
                    : "text-white/50"
              )}
            >
              <div className="mb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                {t.role === "ai"
                  ? assessment.persona.name || "AI"
                  : t.role === "user"
                    ? "You"
                    : "System"}
                {t.followUp ? " · follow-up" : ""}
              </div>
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
