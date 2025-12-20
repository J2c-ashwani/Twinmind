export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">1. Introduction</h2>
                <p>
                    TwinGenie ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">2. Information We Collect</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account Information:</strong> Email address and profile details provided during registration.</li>
                    <li><strong>Usage Data:</strong> Information about how you interact with our services, including chat history and feature usage.</li>
                    <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Provide and improve our services.</li>
                    <li>Personalize your experience.</li>
                    <li>Communicate with you about updates and features.</li>
                    <li>Ensure the security of our platform.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">4. Data Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">5. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at support@twinmind.app.
                </p>
            </section>
        </div>
    );
}
