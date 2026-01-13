// CoinPayment API Types
export interface CreateTransactionParams {
  amount: number;
  currency1: string; // Currency to accept payment in (e.g., 'USD')
  currency2: string; // Currency to send payment in (e.g., 'BTC')
  buyer_email?: string;
  buyer_name?: string;
  item_name?: string;
  item_number?: string;
  invoice?: string;
  custom?: string;
  ipn_url?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CoinPaymentTransactionResult {
  amount: string;
  txn_id: string;
  address: string;
  confirms_needed: string;
  timeout: number;
  status_url: string;
  qrcode_url: string;
}

export interface CoinPaymentTransactionResponse {
  error: string;
  result?: CoinPaymentTransactionResult;
}

export interface CoinPaymentRate {
  is_fiat: number;
  rate_btc: string;
  last_update: string;
  tx_fee: string;
  status: string;
  name: string;
  confirms: string;
  can_convert: number;
  capabilities: string[];
}

export interface CoinPaymentRatesResponse {
  error: string;
  result?: Record<string, CoinPaymentRate>;
}

export interface CoinPaymentIPN {
  ipn_version: string;
  ipn_type: string;
  ipn_mode: string;
  ipn_id: string;
  merchant: string;
  txn_id: string;
  status: number;
  status_text: string;
  currency1: string;
  currency2: string;
  amount1: number;
  amount2: number;
  fee: number;
  buyer_name?: string;
  item_name?: string;
  item_number?: string;
  invoice?: string;
  custom?: string;
  received_amount: number;
  received_confirms: number;
}