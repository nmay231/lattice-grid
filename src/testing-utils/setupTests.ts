import { vi } from "vitest";

global.console = {
    ...console,
    // uncomment and restart vitest to ignore a specific log level

    // log: vi.fn(),
    // debug: vi.fn(),
    // info: vi.fn(),
    warn: vi.fn(),
    // error: vi.fn(),
};
