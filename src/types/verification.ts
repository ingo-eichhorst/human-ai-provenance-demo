export interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

export interface VerificationResult {
  overallStatus: 'pass' | 'fail';
  checks: {
    bundleHash: CheckResult;
    contentHash: CheckResult;
    signature: CheckResult;
    receipt: CheckResult;
    eventChain: CheckResult;
  };
}
