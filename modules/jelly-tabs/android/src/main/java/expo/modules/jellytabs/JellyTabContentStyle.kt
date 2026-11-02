package expo.modules.jellytabs

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private const val DEFAULT_ICON_SIZE_DP = 22f
private const val DEFAULT_ICON_LABEL_GAP_DP = 4f
private const val DEFAULT_LABEL_FONT_SIZE_SP = 12f
private const val DEFAULT_ACTIVE_FONT_WEIGHT = 600
private const val DEFAULT_INACTIVE_FONT_WEIGHT = 500
private const val DEFAULT_PILL_OVERHANG_DP = 0f

class JellyTabContentStyleRecord : Record {
  @Field val iconSize: Float? = null

  @Field val iconLabelGap: Float? = null

  @Field val labelFontSize: Float? = null

  @Field val activeLabelFontFamily: String? = null

  @Field val inactiveLabelFontFamily: String? = null

  @Field val activeLabelFontWeight: Int? = null

  @Field val inactiveLabelFontWeight: Int? = null

  @Field val pillOverhang: Float? = null

  internal fun toStyle() = JellyTabContentStyle(
    iconSizeDp = iconSize ?: DEFAULT_ICON_SIZE_DP,
    iconLabelGapDp = iconLabelGap ?: DEFAULT_ICON_LABEL_GAP_DP,
    labelFontSizeSp = labelFontSize ?: DEFAULT_LABEL_FONT_SIZE_SP,
    active = JellyTabLabelFont(activeLabelFontFamily, activeLabelFontWeight, DEFAULT_ACTIVE_FONT_WEIGHT),
    inactive = JellyTabLabelFont(inactiveLabelFontFamily, inactiveLabelFontWeight, DEFAULT_INACTIVE_FONT_WEIGHT),
    pillOverhangDp = pillOverhang ?: DEFAULT_PILL_OVERHANG_DP,
  )
}

internal data class JellyTabLabelFont(val family: String?, val weight: Int?, val defaultWeight: Int)

internal data class JellyTabContentStyle(
  val iconSizeDp: Float = DEFAULT_ICON_SIZE_DP,
  val iconLabelGapDp: Float = DEFAULT_ICON_LABEL_GAP_DP,
  val labelFontSizeSp: Float = DEFAULT_LABEL_FONT_SIZE_SP,
  val active: JellyTabLabelFont = JellyTabLabelFont(null, null, DEFAULT_ACTIVE_FONT_WEIGHT),
  val inactive: JellyTabLabelFont = JellyTabLabelFont(null, null, DEFAULT_INACTIVE_FONT_WEIGHT),
  val pillOverhangDp: Float = DEFAULT_PILL_OVERHANG_DP,
)
