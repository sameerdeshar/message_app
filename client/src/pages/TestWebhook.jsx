import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TestWebhook = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch logs every 2 seconds
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get('/webhook/logs');
                setLogs(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching logs:", err);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Webhook Test GUI</h1>
            <p className="mb-4 text-gray-600">
                This page polls <code>/webhook/logs</code> every 2 seconds. Send a test event from the Meta App Dashboard to see it here.
            </p>

            {loading && <p>Loading...</p>}

            <div className="space-y-4">
                {logs.map((log, index) => (
                    <div key={index} className="border p-4 rounded shadow-sm bg-white">
                        <div className="text-sm text-gray-500 mb-2">
                            {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">
                            {JSON.stringify(log.body, null, 2)}
                        </pre>
                    </div>
                ))}

                {!loading && logs.length === 0 && (
                    <p className="text-gray-500 italic">No webhook events received yet.</p>
                )}
            </div>
        </div>
    );
};

export default TestWebhook;
