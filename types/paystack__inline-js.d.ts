declare module '@paystack/inline-js' {
  interface TransactionOptions {
    key: string
    email: string
    amount: number
    currency?: string
    label?: string
    ref?: string
    metadata?: Record<string, unknown>
    onSuccess?: (transaction: { reference: string; status: string }) => void
    onCancel?: () => void
  }

  class PaystackPop {
    newTransaction(options: TransactionOptions): void
  }

  export = PaystackPop
}
