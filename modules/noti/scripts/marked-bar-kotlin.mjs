const layouts = (names) => `intArrayOf(${names.map((name) => `R.layout.${name}`).join(", ")})`;
const billList = (list) =>
    `listOf(${list.map((piece, index) => `MarkedPiece(R.id.nmb_b${index}, R.id.nmb_bi${index}, ${piece.size}f, ${piece.size}f, -1)`).join(", ")})`;
const sparkList = (list) =>
    `listOf(${list.map((piece, index) => `MarkedPiece(R.id.nmb_s${index}, R.id.nmb_si${index}, ${piece.width}f, ${piece.height}f, ${piece.tone})`).join(", ")})`;

export const markedBarTablesKotlin = ({
    DURATIONS,
    LIGHT_GRID,
    MAX_REELS,
    LIGHT_STEPS,
    MINI_MARKS,
    reelLines,
    blastTables,
    miniTables,
}) =>
    `package expo.modules.notificationmotion.bills

import expo.modules.notificationmotion.R

internal class MarkedPiece(val trigger: Int, val image: Int, val width: Float, val height: Float, val tone: Int)

internal class MarkedBurst(val bills: List<MarkedPiece>, val sparks: List<MarkedPiece>)

internal object MarkedBarTables {
  const val SHORT_DURATION = ${DURATIONS.short}
  const val CHAIN_DURATION = ${DURATIONS.chain}
  const val LIGHT_GRID = ${LIGHT_GRID}
  const val MAX_REELS = ${MAX_REELS}
  val litMarks = ${layouts(LIGHT_STEPS.map((step) => `nmb_mark_lit_${step}`))}
  val shortReels = ${layouts(Array.from({ length: MAX_REELS }, (_, index) => `nmb_reel_short_${index}`))}
  val chainReels = ${layouts(Array.from({ length: MAX_REELS }, (_, index) => `nmb_reel_chain_${index}`))}
  val shortAmounts = ${layouts([0, 1, 2].map((level) => `nmb_amount_short_${level}`))}
  val chainAmount = R.layout.nmb_amount_chain_0
  val reelLines = intArrayOf(${Array.from({ length: MAX_REELS }, (_, index) => reelLines(index)).join(", ")})
  val shortBlast = MarkedBurst(${billList(blastTables.short.bills)}, ${sparkList(blastTables.short.sparks)})
  val chainBlast = MarkedBurst(${billList(blastTables.chain.bills)}, ${sparkList(blastTables.chain.sparks)})
  val miniMarks = intArrayOf(${MINI_MARKS.join(", ")})
  val miniBoxes = ${layouts(MINI_MARKS.map((mark) => `nmb_mini_${mark}`))}
  val miniBursts = ${layouts(MINI_MARKS.map((mark) => `nmb_miniburst_${mark}`))}
  val mini = listOf(
${MINI_MARKS.map((mark) => `    MarkedBurst(${billList(miniTables[mark].bills)}, ${sparkList(miniTables[mark].sparks)}),`).join("\n")}
  )
}
`;
