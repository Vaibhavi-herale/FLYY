import React from 'react';

const STEPS = [
    { key: 'search',   label: 'Search',   icon: '🔍' },
    { key: 'select',   label: 'Select',   icon: '✈️' },
    { key: 'details',  label: 'Details',  icon: '📋' },
    { key: 'payment',  label: 'Payment',  icon: '💳' },
    { key: 'confirmed',label: 'Confirmed',icon: '✅' },
];

const STATUS_TO_STEP = {
    'Pending Payment':     3,   // on "Payment" step
    'Confirmed':           4,   // all done
    'Cancelled':           -1,  // special
    'Partially Cancelled': 4,
};

export default function BookingStatusTimeline({ bookingStatus, currentStep }) {
    const activeStep = currentStep !== undefined
        ? currentStep
        : (STATUS_TO_STEP[bookingStatus] ?? 0);

    const isCancelled = bookingStatus === 'Cancelled';

    return (
        <div className="w-full py-4">
            {isCancelled ? (
                <div className="flex items-center justify-center gap-2 py-3 px-5 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-red-500 text-xl">❌</span>
                    <span className="text-red-700 font-semibold text-sm">Booking Cancelled</span>
                </div>
            ) : (
                <div className="relative flex items-start justify-between">
                    {/* Progress line */}
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" style={{ marginLeft: '2rem', marginRight: '2rem' }}>
                        <div
                            className="h-full bg-blue-500 transition-all duration-700"
                            style={{ width: activeStep > 0 ? `${(activeStep / (STEPS.length - 1)) * 100}%` : '0%' }}
                        />
                    </div>

                    {STEPS.map((step, i) => {
                        const isDone    = i < activeStep;
                        const isActive  = i === activeStep;
                        const isPending = i > activeStep;

                        return (
                            <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                                <div className={`
                                    w-9 h-9 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all duration-300
                                    ${isDone    ? 'bg-blue-600 border-blue-600 text-white shadow-md' : ''}
                                    ${isActive  ? 'bg-white border-blue-500 text-blue-600 shadow-lg ring-4 ring-blue-100' : ''}
                                    ${isPending ? 'bg-white border-gray-200 text-gray-400' : ''}
                                `}>
                                    {isDone ? '✓' : step.icon}
                                </div>
                                <p className={`mt-2 text-xs font-medium text-center leading-tight
                                    ${isDone   ? 'text-blue-600' : ''}
                                    ${isActive ? 'text-blue-800 font-bold' : ''}
                                    ${isPending ? 'text-gray-400' : ''}
                                `}>
                                    {step.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Status badge */}
            {bookingStatus && !isCancelled && (
                <div className="mt-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                        ${bookingStatus === 'Confirmed'         ? 'bg-green-100 text-green-800' : ''}
                        ${bookingStatus === 'Pending Payment'   ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${bookingStatus === 'Partially Cancelled' ? 'bg-orange-100 text-orange-800' : ''}
                    `}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                        {bookingStatus}
                    </span>
                </div>
            )}
        </div>
    );
}
