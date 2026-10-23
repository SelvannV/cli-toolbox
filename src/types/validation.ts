export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string };

export type Validator<T> = (value: string) => ValidationResult<T>;
