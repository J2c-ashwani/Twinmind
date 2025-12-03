import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Mail, Share2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface CircleInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId: string;
    circleName: string;
}

export default function CircleInviteModal({ isOpen, onClose, circleId, circleName }: CircleInviteModalProps) {
    console.log('CircleInviteModal rendered, isOpen:', isOpen, 'circleId:', circleId);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const generateInvite = async () => {
        console.log('Generating invite for circle:', circleId);
        setIsLoading(true);
        try {
            const data = await apiClient.createCircleInvitation(circleId) as any;
            console.log('Invite generated:', data);
            setInviteCode(data?.invitation?.invitation_code || data?.invitation_code || '');
            setInviteLink(data?.invite_link || '');
        } catch (error) {
            console.error('Failed to generate invite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const shareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${circleName} on TwinMind`,
                    text: `Join my Growth Circle and let's grow together! Use code: ${inviteCode}`,
                    url: inviteLink,
                });
            } catch (error) {
                console.error('Failed to share:', error);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full border border-white/10"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Invite Friends</h2>
                        <button
                            onClick={onClose}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <p className="text-white/60 mb-6">
                        Invite friends to join <span className="text-white font-semibold">{circleName}</span> and
                        unlock exclusive features together!
                    </p>

                    {!inviteCode ? (
                        <button
                            onClick={generateInvite}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isLoading ? 'Generating...' : 'Generate Invitation Link'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Invitation Code */}
                            <div>
                                <label className="text-sm text-white/50 block mb-2">Invitation Code</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-xl text-white text-center tracking-wider">
                                        {inviteCode}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(inviteCode)}
                                        className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-3 text-white transition-colors"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Invitation Link */}
                            <div>
                                <label className="text-sm text-white/50 block mb-2">Invitation Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm truncate">
                                        {inviteLink}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(inviteLink)}
                                        className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-3 text-white transition-colors"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Share Button */}
                            {navigator.share && (
                                <button
                                    onClick={shareNative}
                                    className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white py-3 px-6 rounded-lg font-medium hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Share via...
                                </button>
                            )}

                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs text-white/40 text-center">
                                    This invitation expires in 7 days
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
