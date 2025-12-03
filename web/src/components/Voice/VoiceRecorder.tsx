'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
    onSend: (audioBlob: Blob, duration: number) => void;
    onCancel?: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [waveform, setWaveform] = useState<number[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const animationRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio analysis for waveform
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start waveform animation
            animateWaveform();

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    };

    const animateWaveform = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample 20 points for waveform
        const samples = 20;
        const step = Math.floor(dataArray.length / samples);
        const waveformData = [];
        for (let i = 0; i < samples; i++) {
            waveformData.push(dataArray[i * step] / 255);
        }
        setWaveform(waveformData);

        animationRef.current = requestAnimationFrame(animateWaveform);
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, duration);
            reset();
        }
    };

    const handleCancel = () => {
        reset();
        onCancel?.();
    };

    const reset = () => {
        setIsRecording(false);
        setDuration(0);
        setAudioBlob(null);
        setWaveform([]);
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <AnimatePresence mode="wait">
                {!isRecording && !audioBlob && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                    >
                        <button
                            onClick={startRecording}
                            className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white flex items-center justify-center mx-auto hover:shadow-xl transition-all"
                        >
                            <Mic className="w-8 h-8" />
                        </button>
                        <p className="mt-4 text-gray-600">Tap to start recording</p>
                    </motion.div>
                )}

                {isRecording && (
                    <motion.div
                        key="recording"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Waveform */}
                        <div className="flex items-center justify-center gap-1 h-20">
                            {waveform.map((value, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: `${20 + value * 60}px` }}
                                    className="w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full"
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-red-500">{formatDuration(duration)}</div>
                            <p className="text-sm text-gray-600">Recording...</p>
                        </div>

                        {/* Stop button */}
                        <button
                            onClick={stopRecording}
                            className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Square className="w-5 h-5" />
                            Stop Recording
                        </button>
                    </motion.div>
                )}

                {audioBlob && !isRecording && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Duration */}
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{formatDuration(duration)}</div>
                            <p className="text-sm text-gray-600">Voice message ready</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-5 h-5" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                Send
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
