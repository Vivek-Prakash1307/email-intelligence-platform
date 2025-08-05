import React, { useState } from 'react';

// Main App component for the email checker frontend
const App = () => {
    // State to store the input domains (comma-separated string)
    const [domainsInput, setDomainsInput] = useState('');
    // State to store the results received from the backend
    const [results, setResults] = useState([]);
    // State to manage loading status during API calls
    const [loading, setLoading] = useState(false);
    // State to store any error messages
    const [error, setError] = useState('');

    // Function to handle the domain checking process
    const handleCheckDomains = async () => {
        // Clear previous results and errors
        setResults([]);
        setError('');
        setLoading(true); // Set loading to true while fetching data

        // Split the input string by comma, trim whitespace, and filter out empty strings
        const domains = domainsInput.split(',').map(d => d.trim()).filter(d => d !== '');

        // Basic client-side validation: check if at least one domain is entered
        if (domains.length === 0) {
            setError('Please enter at least one domain to check.');
            setLoading(false);
            return;
        }

        try {
            // Make a POST request to the backend API
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
            const response = await fetch(`${apiUrl}/check-domains`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domains }), // Send domains as a JSON array
            });

            // Check if the response was successful
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong on the server.');
            }

            // Parse the JSON response
            const data = await response.json();
            setResults(data.results); // Update results state with data from backend
        } catch (err) {
            console.error('Error checking domains:', err);
            setError(`Failed to check domains: ${err.message}`); // Display error to user
        } finally {
            setLoading(false); // Always set loading to false after request completes
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 hover:scale-105">
                <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-6">
                    <span role="img" aria-label="email" className="mr-2">📧</span>
                    Email Domain Checker
                </h1>

                <p className="text-center text-gray-600 mb-8">
                    Enter one or more email domains (e.g., `example.com, google.com`) separated by commas to validate their MX records.
                </p>

                <div className="mb-6">
                    <label htmlFor="domains" className="block text-gray-700 text-sm font-bold mb-2">
                        Domains (comma-separated):
                    </label>
                    <input
                        type="text"
                        id="domains"
                        className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        placeholder="e.g., example.com, google.com, nonexist.xyz"
                        value={domainsInput}
                        onChange={(e) => setDomainsInput(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleCheckDomains}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Checking...
                        </div>
                    ) : (
                        'Check Domains'
                    )}
                </button>

                {/* Display error message if any */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

                {/* Display results if available */}
                {results.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Results:</h2>
                        <div className="bg-gray-50 p-4 rounded-lg shadow-inner max-h-60 overflow-y-auto">
                            {results.map((result, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <span className="font-medium text-gray-700">{result.domain}</span>
                                    {result.isValid ? (
                                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                            Valid <span role="img" aria-label="check">✅</span>
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                            Invalid <span role="img" aria-label="cross">❌</span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
