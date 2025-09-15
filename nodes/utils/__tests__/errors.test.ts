import { IExecuteFunctions } from 'n8n-workflow';
import {
    EnreachNodeError,
    EnreachErrorCode,
    createUserFriendlyError
} from '../errors';

describe('Error Handling', () => {
    let mockExecuteFunctions: IExecuteFunctions;

    beforeEach(() => {
        mockExecuteFunctions = {
            getNode: jest.fn().mockReturnValue({ name: 'TestNode', type: 'enreach' })
        } as any;
    });

    describe('EnreachNodeError', () => {
        it('should create error with correct properties', () => {
            const error = new EnreachNodeError(
                mockExecuteFunctions,
                'Test error',
                EnreachErrorCode.AUTH_INVALID_JWT,
                'Custom description',
                0
            );

            expect(error.message).toContain('Test error');
            expect(error.name).toBe('EnreachNodeError');
            expect((error as any).errorCode).toBe(EnreachErrorCode.AUTH_INVALID_JWT);
        });

        it('should use default description when not provided', () => {
            const error = new EnreachNodeError(
                mockExecuteFunctions,
                'JWT error',
                EnreachErrorCode.AUTH_INVALID_JWT,
                undefined,
                0
            );

            expect(error.message).toContain('JWT error');
        });
    });

    describe('createUserFriendlyError', () => {
        it('should create validation text error with details', () => {
            const error = createUserFriendlyError(
                mockExecuteFunctions,
                EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
                { length: 2000, max: 1024 },
                0
            );

            expect(error.message).toContain('2000 characters');
            expect(error.message).toContain('1024');
            expect((error as any).errorCode).toBe(EnreachErrorCode.VALIDATION_TEXT_TOO_LONG);
        });

        it('should create title validation error', () => {
            const error = createUserFriendlyError(
                mockExecuteFunctions,
                EnreachErrorCode.VALIDATION_TITLE_TOO_LONG,
                { title: 'Very long button title text', length: 30, max: 20 },
                0
            );

            expect(error.message).toContain('30 characters');
            expect(error.message).toContain('20');
        });

        it('should create insufficient options error', () => {
            const error = createUserFriendlyError(
                mockExecuteFunctions,
                EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS,
                { min: 3, current: 2 },
                0
            );

            expect(error.message).toContain('at least 3 options');
            expect(error.message).toContain('only 2 provided');
        });

        it('should create missing trigger error', () => {
            const error = createUserFriendlyError(
                mockExecuteFunctions,
                EnreachErrorCode.CONFIG_MISSING_TRIGGER,
                { nodeName: 'MyTrigger' },
                0
            );

            expect(error.message).toContain('MyTrigger');
            expect(error.message).toContain('Cannot find trigger node');
        });

        it('should handle unknown error codes', () => {
            const error = createUserFriendlyError(
                mockExecuteFunctions,
                'UNKNOWN_CODE' as EnreachErrorCode,
                {},
                0
            );

            expect(error.message).toBe('Operation failed');
        });
    });

    // Removed handleApiError tests - function was removed
});