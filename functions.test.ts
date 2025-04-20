import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { calculateAnAverage } from "./functions.ts";
import { Bar } from "./interfaces.ts";

// Mock data for testing
const mockBars: Bar[] = [
  { Symbol: "AAPL", ClosePrice: 150 },
  { Symbol: "AAPL", ClosePrice: 155 },
  { Symbol: "AAPL", ClosePrice: 160 },
  { Symbol: "AAPL", ClosePrice: 165 },
  { Symbol: "AAPL", ClosePrice: 170 },
];

Deno.test(
  "calculateAnAverage - calculates the average of the most recent days",
  () => {
    const daysInAverage = 3;
    const dayOffset = 0;

    const result = calculateAnAverage(daysInAverage, dayOffset, mockBars);

    // Expected average: (150 + 155 + 160) / 3 = 155
    assertEquals(result, 155);
  }
);

Deno.test("calculateAnAverage - calculates the average with an offset", () => {
  const daysInAverage = 2;
  const dayOffset = 1;

  const result = calculateAnAverage(daysInAverage, dayOffset, mockBars);

  // Expected average: (155 + 160) / 2 = 157.5
  assertEquals(result, 157.5);
});

Deno.test(
  "calculateAnAverage - returns 0 if there are not enough bars for the offset",
  () => {
    const daysInAverage = 3;
    const dayOffset = 10;

    const result = calculateAnAverage(daysInAverage, dayOffset, mockBars);

    // Expected result: 0 (not enough data to calculate the average)
    assertEquals(result, 0);
  }
);

Deno.test(
  "calculateAnAverage - still calculates average when the data is smaller than daysInAverage",
  () => {
    const daysInAverage = 10;
    const dayOffset = 1;

    const result = calculateAnAverage(daysInAverage, dayOffset, mockBars);

    // Expected result: 162.5 (should divide by actual count of data, not the too big daysInAverage)
    assertEquals(result, 162.5);
  }
);
