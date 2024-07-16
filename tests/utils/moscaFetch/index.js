function moscaFetch() {
    let originalFetch = globalThis.fetch; // Save the original fetch function
    let mocks = [];
    let records = [];
    

    function mock(mockConfigs) {                
        // Ensure the input is always treated as an array, even if it's a single object
        const configs = Array.isArray(mockConfigs) ? mockConfigs : [mockConfigs];

        configs.forEach(mockConfig => {
            if (!mockConfig.url || !mockConfig.method || !mockConfig.response) {
                throw new Error("Invalid mock configuration: Missing required properties.");
            }            
            mockConfig.isRecorder = false; // Explicitly flag mock configurations as non-recorders
            mocks.push(mockConfig);
        });
        ensureFetchIsMocked();
    }

    function record(recordConfig) {
        recordConfig.isRecorder = true; // Flag record configurations as recorders
        mocks.push(recordConfig);
        ensureFetchIsMocked();
    }

    function getRecords() {
        return records;
    }

    function clearRecords() {
        records = [];
    }

    function restoreAll() {
        globalThis.fetch = originalFetch; // Restore the original fetch function
        mocks = []; // Clear all mocks and recorders
    }

    function restoreOne(url, method) {
        mocks = mocks.filter(mock => !(mock.url === url || mock.url === '*') || mock.method.toLowerCase() !== method.toLowerCase());
        if (mocks.length === 0) {
            restoreAll();
        }
    }

    function ensureFetchIsMocked() {
        if (globalThis.fetch === originalFetch) {
            globalThis.fetch = async (input, options) => {
                for (const mock of mocks) {
                    let { body: requestBody, method: requestMethod = 'GET' } = options || {};
                    requestMethod = requestMethod.toUpperCase();
                    try {
                        requestBody = requestBody ? JSON.parse(requestBody) : undefined;
                    } catch (error) {
                        // requestBody remains unchanged if it's not JSON
                    }

                    const urlMatches = mock.url === '*' || input === mock.url;
                    const methodMatches = mock.method === '*' || mock.method.toUpperCase() === requestMethod;
                    const bodyMatches = mock.body === '*' || JSON.stringify(requestBody) === JSON.stringify(mock.body);

                    if (urlMatches && methodMatches && bodyMatches) {
                        if (mock.isRecorder) {
                            const response = await originalFetch(input, options);
                            const clonedResponse = response.clone();
                            records.push({
                                url: input,
                                method: requestMethod,
                                body: requestBody,
                                response: await clonedResponse.json() // Assuming JSON response
                            });
                            mock.callback({
                                request: { url: input, method: requestMethod, body: requestBody },
                                response: mockResponse,
                                status: mockResponse.status
                            });                            
                            return response; // Ensure recorders do not block the response
                        } else {
                            const mockResponse = new Response(JSON.stringify(mock.response), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                            if (mock.callback) {
                                mock.callback({
                                    request: { url: input, method: requestMethod, body: requestBody },
                                    response: mockResponse,
                                    status: mockResponse.status
                                });
                            }                            
                            return Promise.resolve(mockResponse);
                        }
                    }
                }
                return originalFetch(input, options); // Call the original fetch if no mocks or recorders match
            };
        }
    }

    return { mock, record, getRecords, clearRecords, restoreAll, restoreOne };
}

module.exports = moscaFetch;
