import { jest } from '@jest/globals';
import CaptchaSolver from '../CaptchaSolver';

describe('CaptchaSolver', () => {
    let solver;
    let mockPage;

    beforeEach(() => {
        solver = new CaptchaSolver('test-api-key');
        mockPage = {
            evaluate: jest.fn(),
            url: jest.fn().mockReturnValue('http://test.com'),
            $eval: jest.fn()
        };

        // Mock fetch globally
        global.fetch = jest.fn();
    });

    describe('detectCaptcha', () => {
        it('should detect hCaptcha', async () => {
            mockPage.evaluate.mockResolvedValue(true);
            
            const result = await solver.detectCaptcha(mockPage);
            
            expect(result).toBe(true);
        });

        it('should return false when no CAPTCHA is present', async () => {
            mockPage.evaluate.mockResolvedValue(false);
            
            const result = await solver.detectCaptcha(mockPage);
            
            expect(result).toBe(false);
        });
    });

    describe('solveCaptcha', () => {
        it('should return success when no CAPTCHA is detected', async () => {
            mockPage.evaluate.mockResolvedValue(false);
            
            const result = await solver.solveCaptcha(mockPage);
            
            expect(result.success).toBe(true);
            expect(result.message).toBe('No CAPTCHA detected');
        });

        it('should attempt to solve when CAPTCHA is detected', async () => {
            mockPage.evaluate.mockResolvedValue(true);
            mockPage.$eval.mockResolvedValue('test-site-key');
            
            global.fetch
                .mockResolvedValueOnce({ json: () => Promise.resolve({ request: 'request-id' }) })
                .mockResolvedValueOnce({ json: () => Promise.resolve({ status: 1, request: 'solution' }) });

            const result = await solver.solveCaptcha(mockPage);
            
            expect(result).toBeTruthy();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('handleManualCaptcha', () => {
        it('should handle successful manual solving', async () => {
            mockPage.waitForNavigation = jest.fn().mockResolvedValue(true);
            mockPage.waitForFunction = jest.fn().mockResolvedValue(true);
            
            const result = await solver.handleManualCaptcha(mockPage);
            
            expect(result.success).toBe(true);
            expect(result.message).toBe('CAPTCHA solved manually');
        });

        it('should handle timeout during manual solving', async () => {
            mockPage.waitForNavigation = jest.fn().mockRejectedValue(new Error('Timeout'));
            mockPage.waitForFunction = jest.fn().mockRejectedValue(new Error('Timeout'));
            
            const result = await solver.handleManualCaptcha(mockPage);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('CAPTCHA solving timed out');
        });
    });
}); 