import {
  parseOptions,
  validateMessageParameters,
  calculateTimeout,
  buildMessageBody,
  EnreachOption
} from '../EnreachUtils';
import { ENREACH_LIMITS, TIME_UNITS } from '../constants';

describe('EnreachUtils - Production Tests', () => {

  describe('parseOptions', () => {
    describe('JSON mode', () => {
      it('should parse valid JSON array string', () => {
        const options = '[{"id":"1","title":"Option 1"},{"id":"2","title":"Option 2"},{"id":"3","title":"Option 3"}]';
        const result = parseOptions(options, 'list', false);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: '1', title: 'Option 1' });
      });

      it('should handle already parsed array', () => {
        const options = [
          { id: '1', title: 'Option 1' },
          { id: '2', title: 'Option 2' },
          { id: '3', title: 'Option 3' }
        ];
        const result = parseOptions(options, 'list', false);

        expect(result).toHaveLength(3);
      });

      it('should throw error for list with less than 3 options', () => {
        const options = '[{"id":"1","title":"Option 1"},{"id":"2","title":"Option 2"}]';

        expect(() => parseOptions(options, 'list', false))
          .toThrow(`List type requires a minimum of ${ENREACH_LIMITS.LIST_MIN_OPTIONS} options`);
      });

      it('should accept any number of options for button type', () => {
        const options = '[{"id":"1","title":"Yes"},{"id":"2","title":"No"}]';
        const result = parseOptions(options, 'button', false);

        expect(result).toHaveLength(2);
      });

      it('should handle invalid JSON gracefully', () => {
        const invalidJson = '{"invalid json}';
        const result = parseOptions(invalidJson, 'text', false);

        expect(result).toEqual([]);
      });
    });

    describe('Manual mode', () => {
      it('should parse manual options with all fields', () => {
        const manualOptions = {
          fields: [
            { id: '1', title: 'Option 1', description: 'Description 1' },
            { id: '2', title: 'Option 2', description: 'Description 2' },
            { id: '3', title: 'Option 3' }
          ]
        };

        const result = parseOptions(manualOptions, 'list', true);

        expect(result).toHaveLength(3);
        expect(result[0].description).toBe('Description 1');
        expect(result[2].description).toBeUndefined();
      });

      it('should handle empty manual options', () => {
        const emptyOptions = { fields: [] };
        const result = parseOptions(emptyOptions, 'button', true);

        expect(result).toEqual([]);
      });

      it('should handle missing fields gracefully', () => {
        const malformedOptions = {};
        const result = parseOptions(malformedOptions, 'button', true);

        expect(result).toEqual([]);
      });
    });
  });

  describe('validateMessageParameters', () => {
    describe('Text validation', () => {
      it('should accept text within limit for list type', () => {
        const text = 'a'.repeat(ENREACH_LIMITS.TEXT_MAX_LENGTH);
        expect(() => validateMessageParameters('list', text, '', []))
          .not.toThrow();
      });

      it('should reject text exceeding limit for list type', () => {
        const text = 'a'.repeat(ENREACH_LIMITS.TEXT_MAX_LENGTH + 1);
        expect(() => validateMessageParameters('list', text, '', []))
          .toThrow(/Text message is too long/);
      });

      it('should reject text exceeding limit for button type', () => {
        const text = 'a'.repeat(ENREACH_LIMITS.TEXT_MAX_LENGTH + 1);
        expect(() => validateMessageParameters('button', text, '', []))
          .toThrow(/Text message is too long/);
      });

      it('should allow any text length for text type', () => {
        const text = 'a'.repeat(5000);
        expect(() => validateMessageParameters('text', text, '', []))
          .not.toThrow();
      });
    });

    describe('Button title validation', () => {
      it('should accept button title within limit', () => {
        const title = 'a'.repeat(ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH);
        expect(() => validateMessageParameters('list', 'text', title, []))
          .not.toThrow();
      });

      it('should reject button title exceeding limit', () => {
        const title = 'a'.repeat(ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH + 1);
        expect(() => validateMessageParameters('list', 'text', title, []))
          .toThrow(/Button title is too long/);
      });
    });

    describe('Options validation', () => {
      it('should reject too many options for list type', () => {
        const options: EnreachOption[] = Array.from({ length: ENREACH_LIMITS.LIST_MAX_OPTIONS + 1 },
          (_, i) => ({ id: `${i}`, title: `Option ${i}` }));

        expect(() => validateMessageParameters('list', 'text', '', options))
          .toThrow(/Too many options provided/);
      });

      it('should accept maximum allowed options for list', () => {
        const options: EnreachOption[] = Array.from({ length: ENREACH_LIMITS.LIST_MAX_OPTIONS },
          (_, i) => ({ id: `${i}`, title: `Option ${i}` }));

        expect(() => validateMessageParameters('list', 'text', '', options))
          .not.toThrow();
      });

      it('should reject option with ID exceeding 256 characters', () => {
        const options = [{ id: 'a'.repeat(257), title: 'Test' }];

        expect(() => validateMessageParameters('button', 'text', '', options))
          .toThrow(/Option 1 ID is too long/);
      });

      it('should reject button option with title exceeding 20 characters', () => {
        const options = [{ id: '1', title: 'a'.repeat(21) }];

        expect(() => validateMessageParameters('button', 'text', '', options))
          .toThrow(/Option 1 title is too long/);
      });

      it('should accept list option with long title', () => {
        const options = [
          { id: '1', title: 'a'.repeat(100) },
          { id: '2', title: 'Option 2' },
          { id: '3', title: 'Option 3' }
        ];

        expect(() => validateMessageParameters('list', 'text', '', options))
          .not.toThrow();
      });
    });
  });

  describe('calculateTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return undefined when limitWaitTime is false', () => {
      const result = calculateTimeout(false, 'timeInterval', '', 5, 'minutes');
      expect(result).toBeUndefined();
    });

    it('should calculate correct timeout for seconds', () => {
      const result = calculateTimeout(true, 'timeInterval', '', 30, 'seconds');
      const expected = new Date(Date.now() + 30 * TIME_UNITS.seconds);

      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should calculate correct timeout for minutes', () => {
      const result = calculateTimeout(true, 'timeInterval', '', 15, 'minutes');
      const expected = new Date(Date.now() + 15 * TIME_UNITS.minutes);

      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should calculate correct timeout for hours', () => {
      const result = calculateTimeout(true, 'timeInterval', '', 2, 'hours');
      const expected = new Date(Date.now() + 2 * TIME_UNITS.hours);

      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should calculate correct timeout for days', () => {
      const result = calculateTimeout(true, 'timeInterval', '', 7, 'days');
      const expected = new Date(Date.now() + 7 * TIME_UNITS.days);

      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should handle specific date/time', () => {
      const targetDate = '2024-12-31T23:59:59Z';
      const result = calculateTimeout(true, 'dateTime', targetDate, 0, '');

      expect(result).toEqual(new Date(targetDate));
    });

    it('should handle invalid unit gracefully', () => {
      const result = calculateTimeout(true, 'timeInterval', '', 5, 'invalid');
      const expected = new Date(Date.now()); // No time added for invalid unit

      expect(result?.getTime()).toBe(expected.getTime());
    });
  });

  describe('buildMessageBody', () => {
    const jwt = 'test.jwt.token';
    const text = 'Test message';
    const options: EnreachOption[] = [
      { id: '1', title: 'Option 1' },
      { id: '2', title: 'Option 2' }
    ];

    it('should build basic text message body', () => {
      const result = buildMessageBody('text', jwt, text, []);

      expect(result).toEqual({
        type: 'text',
        jwt,
        text,
        options: []
      });
    });

    it('should include resumUrl when provided', () => {
      const resumeUrl = 'https://webhook.example.com/resume';
      const result = buildMessageBody('text', jwt, text, [], undefined, resumeUrl);

      expect(result.resumUrl).toBe(resumeUrl);
    });

    it('should include buttonTitle for list type only', () => {
      const buttonTitle = 'Choose one';
      const result = buildMessageBody('list', jwt, text, options, buttonTitle);

      expect(result.buttonTitle).toBe(buttonTitle);
    });

    it('should not include buttonTitle for button type', () => {
      const buttonTitle = 'Choose one';
      const result = buildMessageBody('button', jwt, text, options, buttonTitle);

      expect(result.buttonTitle).toBeUndefined();
    });

    it('should include all options in message body', () => {
      const result = buildMessageBody('list', jwt, text, options);

      expect(result.options).toEqual(options);
      expect(result.options).toHaveLength(2);
    });
  });
});