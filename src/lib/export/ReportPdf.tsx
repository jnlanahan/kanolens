import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import { CATEGORY_LABEL, CATEGORY_ORDER, type KanoTableData } from "@/lib/kano-types";
import type { Insight } from "@/components/kano/InsightsPanel";

type Tone = "pos" | "mid" | "neg" | "none";

const TONE_HEX: Record<Tone, { bg: string; fg: string }> = {
  pos: { bg: "#e7f6ed", fg: "#1a7f43" },
  mid: { bg: "#fdf3e0", fg: "#b5760f" },
  neg: { bg: "#fdeaea", fg: "#c0392b" },
  none: { bg: "#f1f1f3", fg: "#7a7a85" },
};

function ratingCell(rating: string): { label: string; tone: Tone } {
  if (!rating || rating === "N/A" || rating === "" || rating === "Cannot Verify")
    return { label: "—", tone: "none" };
  if (rating === "Yes") return { label: "Yes", tone: "pos" };
  if (rating === "No") return { label: "No", tone: "neg" };
  if (rating === "Maybe") return { label: "Partial", tone: "mid" };
  if (rating === "High" || rating === "Maybe High")
    return { label: rating === "Maybe High" ? "~High" : "High", tone: "pos" };
  if (rating === "Medium" || rating === "Maybe Medium")
    return { label: rating === "Maybe Medium" ? "~Med" : "Med", tone: "mid" };
  if (rating === "Low" || rating === "Maybe Low")
    return { label: rating === "Maybe Low" ? "~Low" : "Low", tone: "neg" };
  return { label: rating, tone: "none" };
}

const INSIGHT_LABEL: Record<Insight["type"], string> = {
  opportunity: "Opening",
  risk: "Risk",
  gap: "Gap",
  strength: "Strength",
  concede: "Concede",
};

const styles = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 9, color: "#1c1c22", fontFamily: "Helvetica" },
  eyebrow: { fontSize: 8, letterSpacing: 1, color: "#9a7b1f", textTransform: "uppercase", marginBottom: 3 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  meta: { fontSize: 8, color: "#7a7a85", marginBottom: 14 },
  strategicBox: { backgroundColor: "#fbf6e7", borderRadius: 6, padding: 12, marginBottom: 16, borderLeft: "3px solid #d9b84a" },
  strategicLabel: { fontSize: 8, letterSpacing: 1, color: "#9a7b1f", textTransform: "uppercase", marginBottom: 4 },
  strategicText: { fontSize: 10, lineHeight: 1.5 },
  sectionHead: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 6 },
  catRibbon: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#55555f", backgroundColor: "#f3f3f5", paddingVertical: 3, paddingHorizontal: 5, marginTop: 6 },
  row: { flexDirection: "row", borderBottom: "0.5px solid #e6e6ea", minHeight: 18, alignItems: "stretch" },
  headRow: { flexDirection: "row", borderBottom: "1px solid #c9c9d0", paddingBottom: 3 },
  featCol: { width: "34%", paddingRight: 6, paddingVertical: 3 },
  featName: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  featBenefit: { fontSize: 7, color: "#7a7a85" },
  prodHead: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textAlign: "center", paddingVertical: 3 },
  cell: { justifyContent: "center", alignItems: "center", paddingVertical: 3, marginHorizontal: 1 },
  chip: { fontSize: 7.5, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 3, textAlign: "center" },
  insightRow: { marginBottom: 5 },
  insightLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#7a7a85" },
  insightTitle: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  insightBody: { fontSize: 8, color: "#55555f", lineHeight: 1.4 },
  sourceItem: { fontSize: 7, color: "#3457b8", marginBottom: 2 },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, fontSize: 7, color: "#9a9aa3", textAlign: "center" },
});

export interface ReportPdfProps {
  title: string;
  table: KanoTableData;
  insights: Insight[];
  generatedAt: string;
}

export function ReportPdf({ title, table, insights, generatedAt }: ReportPdfProps) {
  const products = table.products;
  const prodWidth = `${66 / Math.max(products.length, 1)}%`;

  return (
    <Document title={title} author="KanoLens">
      <Page size="A4" orientation={products.length > 5 ? "landscape" : "portrait"} style={styles.page} wrap>
        <Text style={styles.eyebrow}>KanoLens competitive analysis</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {products.length} products · {table.features.length} benefits · generated {generatedAt}
        </Text>

        {table.summary?.trim() ? (
          <View style={styles.strategicBox}>
            <Text style={styles.strategicLabel}>Strategic read</Text>
            <Text style={styles.strategicText}>{table.summary}</Text>
          </View>
        ) : null}

        {/* Matrix header */}
        <View style={styles.headRow}>
          <View style={styles.featCol}>
            <Text style={styles.featName}>Feature / benefit</Text>
          </View>
          {products.map((p) => (
            <Text key={p} style={[styles.prodHead, { width: prodWidth }]}>
              {p}
            </Text>
          ))}
        </View>

        {/* Category groups */}
        {CATEGORY_ORDER.map((category) => {
          const features = table.features.filter((f) => f.category === category);
          if (features.length === 0) return null;
          return (
            <View key={category} wrap={false}>
              <Text style={styles.catRibbon}>{CATEGORY_LABEL[category]}</Text>
              {features.map((feature) => (
                <View key={feature.id} style={styles.row} wrap={false}>
                  <View style={styles.featCol}>
                    <Text style={styles.featName}>{feature.name}</Text>
                    <Text style={styles.featBenefit}>{feature.customerBenefit}</Text>
                  </View>
                  {products.map((p) => {
                    const { label, tone } = ratingCell(table.ratings[feature.id]?.[p] ?? "N/A");
                    const isEst = table.estimated?.[feature.id]?.[p];
                    const { bg, fg } = TONE_HEX[tone];
                    return (
                      <View key={p} style={[styles.cell, { width: prodWidth }]}>
                        <Text style={[styles.chip, { backgroundColor: bg, color: fg }]}>
                          {label}
                          {isEst ? " *" : ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        {insights.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionHead}>What it means</Text>
            {insights.slice(0, 8).map((ins) => (
              <View key={ins.id} style={styles.insightRow}>
                <Text style={styles.insightLabel}>{INSIGHT_LABEL[ins.type]}</Text>
                <Text style={styles.insightTitle}>{ins.title}</Text>
                <Text style={styles.insightBody}>{ins.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.meta}>* = unverified best estimate. — = could not verify.</Text>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `KanoLens · page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
