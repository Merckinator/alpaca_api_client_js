export interface Averages {
  longAverages: number[];
  shortAverages: number[];
  symbol: string;
}

export interface Bar {
  ClosePrice: number;
  Symbol: string;
}

export interface Position {
  qty: string;
  symbol: string;
}
