'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MessageLimitBannerProps {
    messagesUsed: number;
    dailyLimit: number;
    isVisible: boolean;
}

export default function MessageLimitBanner({
    messagesUsed,
    dailyLimit,
    isVisible,
}: MessageLimitBannerProps) {
    const router = useRouter();
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app';
    const remaining = dailyLimit - messagesUsed;
    const percentage = (messagesUsed / dailyLimit) * 100;

    // Show when user has used 7+ messages or hit limit
    const shouldShow = isVisible && (messagesUsed >= 7 || remaining === 0);

    const getColor = () => {
        if (remaining === 0) return 'from-red-500 to-pink-500';
        if (remaining <= 2) return 'from-orange-500 to-red-500';
        return 'from-purple-500 to-pink-500';
    };

    const getMessage = () => {
        if (remaining === 0) {
            return {
                title: "You've hit your daily limit",
                subtitle: "Install the Android app to subscribe with Google Play",
                cta: "Open Play Store",
            };
        }
        if (remaining <= 2) {
            return {
                title: `Only ${remaining} messages left today!`,
                subtitle: "Premium is available through Google Play in the Android app",
                cta: "Continue in App",
            };
        }
        return {
            title: `${remaining} messages remaining today`,
            subtitle: "Get unlimited access by subscribing in the Android app",
            cta: "Install App",
        };
    };

    const message = getMessage();

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-20 left-0 right-0 z-50 px-4"
                >
                    <div className="max-w-2xl mx-auto">
                        <div
                            className={`bg-gradient-to-r ${getColor()} rounded-2xl shadow-2xl p-6 text-white`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {remaining === 0 ? (
                                            <Zap className="w-5 h-5" />
                                        ) : (
                                            <Sparkles className="w-5 h-5" />
                                        )}
                                        <h3 className="font-bold text-lg">{message.title}</h3>
                                    </div>

                                    <p className="text-white/90 text-sm mb-4">
                                        {message.subtitle}
                                    </p>

                                    {/* Progress bar */}
                                    <div className="bg-white/20 rounded-full h-2 mb-4">
                                        <div
                                            className="bg-white rounded-full h-2 transition-all duration-300"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                if (typeof window !== 'undefined' && /android/i.test(navigator.userAgent)) {
                                                    window.location.href = playStoreUrl;
                                                } else {
                                                    router.push('/subscription');
                                                }
                                            }}
                                            className="bg-white text-purple-600 px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                                        >
                                            <Smartphone className="mr-2 inline h-4 w-4" />
                                            {message.cta}
                                        </button>
                                        <span className="text-sm text-white/80">
                                            {messagesUsed}/{dailyLimit} used
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { }}
                                    className="text-white/60 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
