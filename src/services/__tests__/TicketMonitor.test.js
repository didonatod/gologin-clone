import { jest } from '@jest/globals';
import TicketMonitor from '../TicketMonitor';
import CaptchaSolver from '../CaptchaSolver';

// Mock CaptchaSolver
jest.mock('../CaptchaSolver');

// Add this at the top of the test file
jest.setTimeout(10000); // Increase timeout to 10 seconds

describe('TicketMonitor', () => {
    let monitor;
    let mockProfile;
    let mockPage;

    beforeEach(() => {
        // Setup mock profile and browser
        mockPage = {
            goto: jest.fn(),
            evaluate: jest.fn(),
            close: jest.fn(),
            hover: jest.fn(),
            click: jest.fn(),
            type: jest.fn(),
            waitForSelector: jest.fn(),
            $eval: jest.fn(),
            url: 'http://test-event.com'
        };

        mockProfile = {
            id: 'test-profile-1',
            browser: {
                newPage: jest.fn().mockResolvedValue(mockPage)
            },
            purchaseDetails: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            }
        };

        monitor = new TicketMonitor(mockProfile);
    });

    describe('checkTickets', () => {
        it('should check ticket availability correctly', async () => {
            const mockTickets = [
                { section: 'A1', row: '1', price: '100', available: true },
                { section: 'A2', row: '2', price: '150', available: false }
            ];

            mockPage.evaluate.mockResolvedValue(mockTickets);

            const result = await monitor.checkTickets('http://test-event.com');

            expect(result.available).toBe(true);
            expect(result.tickets).toEqual(mockTickets);
            expect(mockPage.goto).toHaveBeenCalledWith(
                'http://test-event.com',
                { waitUntil: 'networkidle0' }
            );
        });

        it('should handle CAPTCHA when present', async () => {
            mockPage.evaluate.mockResolvedValueOnce(true); // hasCaptcha
            mockPage.evaluate.mockResolvedValueOnce([{ available: true }]); // ticket data

            await monitor.checkTickets('http://test-event.com');

            expect(monitor.captchaSolver.solve).toHaveBeenCalled();
        });
    });

    describe('initiatePurchase', () => {
        it('should complete purchase successfully', async () => {
            const mockTickets = {
                tickets: [
                    { section: 'A1', row: '1', price: '100', available: true }
                ]
            };

            // Mock the waitForSelector to resolve immediately
            mockPage.waitForSelector.mockResolvedValue(true);
            mockPage.$eval.mockResolvedValue('CONF123');

            const result = await monitor.initiatePurchase(mockTickets);

            expect(result.success).toBe(true);
            expect(result.confirmationNumber).toBe('CONF123');
            expect(monitor.purchaseHistory.length).toBe(1);
        });

        it('should handle purchase failures', async () => {
            const mockTickets = {
                tickets: [
                    { section: 'A1', row: '1', price: '100', available: true }
                ]
            };

            mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));

            const result = await monitor.initiatePurchase(mockTickets);

            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
            expect(monitor.purchaseHistory.length).toBe(0);
        });
    });
}); 