global.console = {
    ...console,
    // uncomment and restart jest to ignore a specific log level

    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    warn: jest.fn(),
    // error: jest.fn(),
};

export {};
