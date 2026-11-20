import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", color: "#0F172A", fontSize: 11 },
  heading: { color: "#2563EB", fontSize: 20, marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 28 },
  row: { borderBottom: "1 solid #E2E8F0", paddingVertical: 11, flexDirection: "row" },
  label: { width: 140, color: "#64748B" },
  value: { flex: 1, fontWeight: 700 },
  footer: { marginTop: 32, color: "#64748B", fontSize: 9 },
});

export type RegistrationReceiptData = { registrationNo: string; studentName: string; trackName: string; status: string; period: string };

export function RegistrationReceipt({ data }: { data: RegistrationReceiptData }) {
  const rows = [
    ["Nomor pendaftaran", data.registrationNo],
    ["Nama calon murid", data.studentName],
    ["Jalur pendaftaran", data.trackName],
    ["Periode", data.period],
    ["Status", data.status],
  ];
  return (
    <Document title={`Bukti pendaftaran ${data.registrationNo}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>SPMB SMPN 9 Depok</Text>
        <Text style={styles.subtitle}>Bukti pendaftaran murid baru 2027/2028</Text>
        <View>{rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
        <Text style={styles.footer}>Dokumen ini diterbitkan oleh Portal SPMB SMPN 9 Depok.</Text>
      </Page>
    </Document>
  );
}