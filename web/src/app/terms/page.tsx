export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                <p>
                    By accessing or using TwinGenie, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">2. User Accounts</h2>
                <p>
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">3. Acceptable Use</h2>
                <p>You agree not to use TwinGenie to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Violate any laws or regulations.</li>
                    <li>Infringe upon the rights of others.</li>
                    <li>Distribute malware or harmful code.</li>
                    <li>Harass, abuse, or harm others.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">4. Intellectual Property</h2>
                <p>
                    The content, features, and functionality of TwinGenie are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">5. Termination</h2>
                <p>
                    We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">6. Changes to Terms</h2>
                <p>
                    We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes.
                </p>
            </section>
        </div>
    );
}
