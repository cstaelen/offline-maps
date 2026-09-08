export {};

declare global {
  namespace Intl {
    interface DurationFormatInput {
      years?: number;
      months?: number;
      weeks?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      milliseconds?: number;
      microseconds?: number;
      nanoseconds?: number;
    }

    interface DurationFormatOptions {
      style?: "long" | "short" | "narrow" | "digital";
    }

    class DurationFormat {
      constructor(locales?: string | string[], options?: DurationFormatOptions);
      format(duration: DurationFormatInput): string;
    }
  }
}
