const aiTools = [
    {
        type: "function",
        function: {
            name: "getUserContext",
            description: "Fetches the context for a given user including past bookings, upcoming flights, and saved passengers. Use this at the start if the user provides an email.",
            parameters: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        description: "The user's email address (e.g. test@example.com)"
                    }
                },
                required: ["email"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "searchLocations",
            description: "Takes a casual city name, airport name, or fuzzy location from a user (like 'NYC', 'London', 'LAX') and returns the standardized 3-letter IATA airport codes needed for flight searches.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The casual location name to search for (e.g. 'new york', 'heathrow', 'sfo'). Omit this to get a list of ALL supported airports."
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "searchFlights",
            description: "Searches the database for available flights matching the specific criteria. ALL locations must use standard 3-letter IATA codes (e.g., JFK, LHR). If you don't know the code, use searchLocations first.",
            parameters: {
                type: "object",
                properties: {
                    departure: {
                        type: "string",
                        description: "3-letter IATA Airport Code (e.g., JFK, SFO)"
                    },
                    destination: {
                        type: "string",
                        description: "3-letter IATA Airport Code (e.g., LHR, LAX)"
                    },
                    date: {
                        type: "string",
                        description: "Departure date in ISO string format (e.g. 2026-03-01)"
                    },
                    passengers: {
                        type: "number",
                        description: "Number of passengers flying"
                    },
                    cabinClass: {
                        type: "string",
                        enum: ["economy", "business", "first"],
                        description: "The cabin class for the search"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "lockSeats",
            description: "Locks seats temporarily (for 5 minutes) before a payment is processed. You MUST lock seats before asking the user for payment and before calling createBooking.",
            parameters: {
                type: "object",
                properties: {
                    flightId: { type: "string", description: "The unique _id string of the flight" },
                    cabinClass: { type: "string", enum: ["economy", "business", "first"], description: "The cabin class selected" },
                    count: { type: "number", description: "Number of seats to lock" }
                },
                required: ["flightId", "cabinClass", "count"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createBooking",
            description: "Creates a formal booking in the system and returns a Dodo Payments checkout URL. You MUST provide this URL to the user to complete their payment. WARNING: You must have an exact flightId, and complete arrays for passengers.",
            parameters: {
                type: "object",
                properties: {
                    flightId: {
                        type: "string",
                        description: "The unique _id string of the flight"
                    },
                    contactEmail: {
                        type: "string",
                        description: "The main email address for the booking"
                    },
                    cabinClass: {
                        type: "string",
                        enum: ['economy', 'business', 'first']
                    },
                    passengers: {
                        type: "array",
                        description: "An array of passenger objects. ALL fields are mandatory.",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                phoneNumber: { type: "string" },
                                passportNumber: { type: "string" },
                                dateOfBirth: { type: "string", description: "YYYY-MM-DD" },
                                nationality: { type: "string" },
                                issueDate: { type: "string", description: "YYYY-MM-DD" },
                                expiryDate: { type: "string", description: "YYYY-MM-DD" }
                            },
                            required: ["name", "email", "phoneNumber", "passportNumber", "dateOfBirth", "nationality", "issueDate", "expiryDate"]
                        }
                    },
                    lockId: {
                        type: "string",
                        description: "The lockId retrieved from calling lockSeats beforehand, if any."
                    },
                    seats: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional array of selected seat numbers (e.g., ['12A', '12B']). If not specified, the system will assign them automatically."
                    }
                },
                required: ["flightId", "contactEmail", "cabinClass", "passengers"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cancelBooking",
            description: "Cancels a booking or specific passengers from a booking using the PNR and contact email.",
            parameters: {
                type: "object",
                properties: {
                    pnr: { type: "string" },
                    email: { type: "string" },
                    passengerEmails: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional array of specific passenger emails to cancel. If empty, cancels the entire booking."
                    }
                },
                required: ["pnr", "email"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getBooking",
            description: "Fetches booking details utilizing the PNR (Passenger Name Record).",
            parameters: {
                type: "object",
                properties: {
                    pnr: { type: "string" }
                },
                required: ["pnr"]
            }
        }
    },
    /*
    {
        type: "function",
        function: {
            name: "processPayment",
            description: "Processes a payment for a booking. Uses a mocked internal payment gateway.",
            parameters: {
                type: "object",
                properties: {
                    amount: { type: "number" },
                    currency: { type: "string" },
                    paymentMethod: { type: "string", enum: ["card", "UPI", "wallet"] },
                    paymentDetails: { type: "object" },
                    bookingRef: { type: "string", description: "PNR or Booking ID" }
                },
                required: ["amount", "paymentMethod"]
            }
        }
    },
    */
    {
        type: "function",
        function: {
            name: "getPaymentStatus",
            description: "Fetches the current status of a payment using the transaction ID.",
            parameters: {
                type: "object",
                properties: {
                    transactionId: { type: "string" }
                },
                required: ["transactionId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "trackFlight",
            description: "Fetches real-time tracking details and status for a given flight number.",
            parameters: {
                type: "object",
                properties: {
                    flightNumber: { type: "string", description: "The IATA flight number to track, e.g., 'AA100'." }
                },
                required: ["flightNumber"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createPriceAlert",
            description: "Creates an email alert for a user when flight prices drop below a target amount for a specific route and date.",
            parameters: {
                type: "object",
                properties: {
                    email: { type: "string", description: "The user's email address" },
                    departureCity: { type: "string", description: "3-letter IATA code or city ID for departure" },
                    destinationCity: { type: "string", description: "3-letter IATA code or city ID for destination" },
                    targetPrice: { type: "number", description: "The target price threshold in USD" },
                    date: { type: "string", description: "The date of the flight in YYYY-MM-DD format" }
                },
                required: ["email", "departureCity", "destinationCity", "targetPrice", "date"]
            }
        }
    }
];

const openAiTools = aiTools;

// Gemini requires the actual "functionDeclarations" array shape
const geminiTools = [
    {
        functionDeclarations: [
            {
                name: "getUserContext",
                description: "Fetches the context for a given user including past bookings, upcoming flights, and saved passengers. Use this at the start if the user provides an email.",
                parameters: openAiTools[0].function.parameters
            },
            {
                name: "searchLocations",
                description: "Takes a casual city name, airport name, or fuzzy location and returns exact 3-letter IATA airport codes.",
                parameters: openAiTools[1].function.parameters
            },
            {
                name: "searchFlights",
                description: "Searches the database for available flights matching criteria. Call with no arguments for all flights.",
                parameters: openAiTools[2].function.parameters
            },
            {
                name: "lockSeats",
                description: "Locks seats temporarily before payment processing.",
                parameters: openAiTools[3].function.parameters
            },
            {
                name: "createBooking",
                description: "Creates a booking and returns a Dodo Payments checkout URL. You MUST provide this URL to the user to complete their payment.",
                parameters: openAiTools[4].function.parameters
            },
            {
                name: "cancelBooking",
                description: "Cancels a booking or specific passengers using PNR.",
                parameters: openAiTools[5].function.parameters
            },
            {
                name: "getBooking",
                description: "Fetches the details of a booking using the PNR.",
                parameters: openAiTools[6].function.parameters
            },
            /*
            {
                name: "processPayment",
                description: "Processes a payment transaction.",
                parameters: openAiTools[7].function.parameters
            },
            */
            {
                name: "getPaymentStatus",
                description: "Retrieves payment status using a transaction ID.",
                parameters: openAiTools.find(t => t.function.name === 'getPaymentStatus').function.parameters
            },
            {
                name: "trackFlight",
                description: "Fetches real-time tracking details and status for a given flight number.",
                parameters: openAiTools.find(t => t.function.name === 'trackFlight').function.parameters
            },
            {
                name: "createPriceAlert",
                description: "Creates an email alert for a user when flight prices drop below a target amount.",
                parameters: openAiTools.find(t => t.function.name === 'createPriceAlert').function.parameters
            }
        ]
    }
];

module.exports = { openAiTools, geminiTools };