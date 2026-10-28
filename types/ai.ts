export type AssistantStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "success"
  | "error"
  | "aborted";

export type AssistMode = "improve" | "shorten";

export type CheckIssueType =
  | "spelling"
  | "punctuation"
  | "grammar"
  | "style"
  | "typography"
  | "other";

export interface CheckIssue {
  offset: number;
  length: number;
  message: string;
  rule: string;
  issueType: CheckIssueType;
  replacements: string[];
}

export type AIErrorCode =
  | "missing_key"
  | "unauthorized"
  | "rate_limit"
  | "payload_too_large"
  | "bad_request"
  | "timeout"
  | "empty_response"
  | "network"
  | "aborted"
  | "server";

export interface AIError {
  code: AIErrorCode;
  message: string;
  hint?: string;
  retryable: boolean;
  status?: number;
}

export interface StreamMeta {
  model: string;
  durationMs: number;
  completionTokens?: number;
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "error"; error: AIError }
  | { type: "done"; meta: StreamMeta };

export interface ImproveRequest {
  text: string;
  mode: AssistMode;
}

export interface ImproveErrorBody {
  error: AIError;
}
