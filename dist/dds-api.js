import DdsLoader from "./vendor/dds.js";

const SIZE_OF_INT = 4;
const TABLE_ROWS = 5;
const TABLE_COLUMNS = 4;
const DEAL_PBN_SIZE = 112;
const REMAIN_CARDS_OFFSET = 32;
const FUTURE_TRICKS_SIZE = 216;
const FUTURE_SCORE_OFFSET = 164;

export class DdsEngine {
  constructor(module) {
    this.module = module;
    this.module.ccall("SetMaxThreads", null, ["number"], [0]);
  }

  static async create() {
    return new DdsEngine(await DdsLoader());
  }

  calcTable(cards) {
    const dealPointer = this.module._malloc(80);
    const resultPointer = this.module._malloc(TABLE_ROWS * TABLE_COLUMNS * SIZE_OF_INT);
    try {
      this.module.stringToUTF8(cards, dealPointer, 80);
      const code = this.module.ccall(
        "CalcDDtablePBN",
        "number",
        ["number", "number"],
        [dealPointer, resultPointer]
      );
      if (code !== 1) throw new Error(`DDS 分析錯誤（代碼 ${code}）`);
      return Array.from({ length: TABLE_ROWS }, (_, row) =>
        Array.from({ length: TABLE_COLUMNS }, (_, column) =>
          this.module.getValue(
            resultPointer + (row * TABLE_COLUMNS + column) * SIZE_OF_INT,
            "i32"
          )
        )
      );
    } finally {
      this.module._free(dealPointer);
      this.module._free(resultPointer);
    }
  }

  solveContract(cards, trump, declarer) {
    const dealPointer = this.module._malloc(DEAL_PBN_SIZE);
    const futurePointer = this.module._malloc(FUTURE_TRICKS_SIZE);
    try {
      const openingLeader = (declarer + 1) % 4;
      this.module.setValue(dealPointer, trump, "i32");
      this.module.setValue(dealPointer + 4, openingLeader, "i32");
      for (let index = 0; index < 3; index++) {
        this.module.setValue(dealPointer + 8 + index * SIZE_OF_INT, 0, "i32");
        this.module.setValue(dealPointer + 20 + index * SIZE_OF_INT, 0, "i32");
      }
      this.module.stringToUTF8(cards, dealPointer + REMAIN_CARDS_OFFSET, 80);
      const code = this.module.ccall(
        "SolveBoardPBN",
        "number",
        ["number", "number", "number", "number", "number", "number"],
        [dealPointer, -1, 1, 0, futurePointer, 0]
      );
      if (code !== 1) throw new Error(`DDS 分析錯誤（代碼 ${code}）`);
      const defendingTricks = this.module.getValue(
        futurePointer + FUTURE_SCORE_OFFSET,
        "i32"
      );
      const declarerTricks = 13 - defendingTricks;
      if (declarerTricks < 0 || declarerTricks > 13) {
        throw new Error("DDS 回傳了無效的磴數");
      }
      return declarerTricks;
    } finally {
      this.module._free(dealPointer);
      this.module._free(futurePointer);
    }
  }
}
