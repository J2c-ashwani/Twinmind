import Link from 'next/link'

interface BrandMarkProps {
    size?: 'sm' | 'md' | 'lg'
    showTagline?: boolean
    href?: string
    className?: string
}

export function BrandEmblem({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-xl'
    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'

    return (
        <span
            className={`${dim} relative inline-flex shrink-0 items-center justify-center border border-white/15 bg-gradient-to-b from-[#1A1E29] to-[#0D1016] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(0,0,0,0.45)]`}
        >
            <svg viewBox="0 0 24 24" fill="none" className={iconSize} aria-hidden="true">
                {/* Dual-aspect geometric mirror mark representing cognitive twin perspectives */}
                <path
                    d="M11 4.25C7.134 4.25 4 7.384 4 11.25C4 15.116 7.134 18.25 11 18.25V4.25Z"
                    stroke="#F4F2EC"
                    strokeWidth="1.65"
                    strokeLinejoin="round"
                />
                <path
                    d="M13 5.75C16.866 5.75 20 8.884 20 12.75C20 16.616 16.866 19.75 13 19.75V5.75Z"
                    stroke="#D9A760"
                    strokeWidth="1.65"
                    strokeLinejoin="round"
                />
                <circle cx="8.25" cy="11.25" r="1.15" fill="#F4F2EC" />
                <circle cx="15.75" cy="12.75" r="1.15" fill="#D9A760" />
            </svg>
        </span>
    )
}

export default function BrandMark({
    size = 'md',
    showTagline = false,
    href = '/',
    className = '',
}: BrandMarkProps) {
    const content = (
        <span className={`inline-flex items-center gap-3 group ${className}`}>
            <BrandEmblem size={size} />
            <span className="flex flex-col leading-none">
                <span className="flex items-center gap-2">
                    <span className="font-semibold tracking-[-0.02em] text-[#F4F2EC] text-lg sm:text-[19px]">
                        TwinGenie
                    </span>
                    {showTagline && (
                        <span className="hidden sm:inline-flex items-center rounded-md border border-[#D9A760]/30 bg-[#D9A760]/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[#E7C891]">
                            Psychometric AI
                        </span>
                    )}
                </span>
            </span>
        </span>
    )

    if (!href) return content

    return (
        <Link href={href} className="inline-flex items-center focus:outline-none">
            {content}
        </Link>
    )
}
