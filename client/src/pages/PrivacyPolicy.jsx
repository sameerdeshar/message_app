import React from 'react';

const PrivacyPolicy = () => {
    const lastUpdated = "January 28, 2026";
    const appName = "GracePort Pro";

    return (
        <div className="min-h-screen bg-light py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-primary p-8 text-white">
                    <h1 className="text-3xl font-bold">Privacy Policy</h1>
                    <p className="mt-2 text-blue-100 italic">Last Updated: {lastUpdated}</p>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-12 space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">1. Introduction</h2>
                        <p>
                            Welcome to <strong>{appName}</strong>. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you use our application
                            (specifically our Facebook Messenger dashboard services) and tell you about your privacy rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">2. The Data We Collect</h2>
                        <p>
                            To provide our Messenger dashboard services, we collect and process data through the Meta (Facebook) API, including:
                        </p>
                        <ul className="list-disc ml-6 mt-4 space-y-2">
                            <li><strong>Message Content:</strong> The text and attachments sent between your Facebook Page and your customers.</li>
                            <li><strong>Customer Profiles:</strong> Basic information such as names and profile pictures as provided by the Meta Graph API.</li>
                            <li><strong>System Data:</strong> Log data, IP addresses, and browser information for security and performance monitoring.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">3. How We Use Your Data</h2>
                        <p>
                            We use your data only for the following purposes:
                        </p>
                        <ul className="list-disc ml-6 mt-4 space-y-2">
                            <li>To provide the core functionality of the Messenger Management Dashboard.</li>
                            <li>To allow authorized agents to respond to customer inquiries.</li>
                            <li>To maintain a history of communications for business continuity.</li>
                            <li>To ensure the security and integrity of our application.</li>
                        </ul>
                        <p className="mt-4 font-semibold text-primary">
                            We do not sell your personal data or provide it to third-party advertisers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">4. Data Retention and Deletion</h2>
                        <p>
                            We retain communication data for as long as necessary to provide the services requested by the user.
                            Users can request data deletion by contacting the system administrator.
                            We also comply with Meta's data processing terms regarding the deletion of user data when requested via the Meta platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">5. Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost,
                            used, or accessed in an unauthorized way, altered, or disclosed. Access to your personal data is limited
                            to those employees and agents who have a business need to know.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">6. Third-Party Services</h2>
                        <p>
                            Our app interacts directly with <strong>Meta Platforms, Inc.</strong> data via their official APIs.
                            Your use of our app is also subject to Meta's Privacy Policy and Terms of Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-dark mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions about this privacy policy or our privacy practices, please contact us at:
                        </p>
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="font-medium">GracePort Pro Admin</p>
                            <p>Email: admin@graceportpro.com</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                        &copy; 2026 {appName}. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
