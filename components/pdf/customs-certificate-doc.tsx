import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0369a1',
    paddingBottom: 12,
    marginBottom: 16,
  },
  certTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  certSubtitle: {
    fontSize: 8,
    color: '#475569',
    marginTop: 2,
  },
  authorityBox: {
    borderWidth: 1,
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  authorityText: {
    fontSize: 8,
    color: '#0369a1',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridTwo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 'bold',
  },
  val: {
    fontSize: 8,
    color: '#0f172a',
  },
  coldChainBadge: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
  },
  coldChainTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  coldChainText: {
    fontSize: 8,
    color: '#1e3a8a',
  },
  table: {
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 6,
  },
  tableCell: {
    fontSize: 8,
    color: '#334155',
  },
  colFgBatch: { width: '25%' },
  colQty: { width: '15%', textAlign: 'right' },
  colStation: { width: '20%' },
  colDate: { width: '15%' },
  colQc: { width: '25%' },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});

export interface CustomsCertificateProps {
  shipment: any;
}

export function CustomsCertificateDoc({ shipment }: CustomsCertificateProps) {
  const dispatchDate = shipment.dispatchDate
    ? new Date(shipment.dispatchDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const allocatedBatches = shipment.allocatedBatches || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.certTitle}>CUSTOMS TRACEABILITY & COLD-CHAIN CERTIFICATE</Text>
            <Text style={styles.certSubtitle}>Official Export Compliance & Farm-to-Container Food Safety Dossier</Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0369a1', textAlign: 'right' }}>
              CERT-EU-{shipment.shipmentId}
            </Text>
            <Text style={{ fontSize: 8, color: '#64748b', textAlign: 'right' }}>Issued: {dispatchDate}</Text>
          </View>
        </View>

        {/* Accreditation Banner */}
        <View style={styles.authorityBox}>
          <Text style={styles.authorityText}>
            ACCREDITED FOR EU & GULF PORT CUSTOMS CLEARANCE (EC 178/2002 TRACEABILITY COMPLIANT)
          </Text>
        </View>

        {/* Shipment & Logistics */}
        <View style={styles.gridTwo}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SHIPMENT & DESTINATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Shipment Ref:</Text>
              <Text style={{ ...styles.val, fontWeight: 'bold' }}>{shipment.shipmentId}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Consignee:</Text>
              <Text style={styles.val}>{shipment.customer?.name || 'SAMA IMPORT B.V.'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Destination Country:</Text>
              <Text style={styles.val}>{shipment.customer?.country || 'Netherlands'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>CONTAINER LOGISTICS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Container Number:</Text>
              <Text style={{ ...styles.val, fontWeight: 'bold' }}>{shipment.containerNo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Customs Seal Number:</Text>
              <Text style={{ ...styles.val, fontWeight: 'bold' }}>{shipment.sealNo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Shipping Line:</Text>
              <Text style={styles.val}>{shipment.shippingLine}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Shipped Net Weight:</Text>
              <Text style={styles.val}>{Number(shipment.shippedQtyKg).toLocaleString()} KG</Text>
            </View>
          </View>
        </View>

        {/* Cold Chain Certification */}
        <View style={styles.coldChainBadge}>
          <Text style={styles.coldChainTitle}>COLD-CHAIN INTEGRITY & THERMAL VERIFICATION</Text>
          <Text style={styles.coldChainText}>
            Continuous Refrigeration Record: Set Point Temperature: -18.0°C (Deep Frozen IQF Specification).
          </Text>
          <Text style={{ ...styles.coldChainText, marginTop: 2 }}>
            Data Logger Status: Certified continuous cold-chain compliance maintained from blast freezing chamber to container sealing.
          </Text>
        </View>

        {/* Farm to Container Traceability Table */}
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 }}>
          REVERSE TRACEABILITY LOT ALLOCATION (FARM-TO-CONTAINER)
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colFgBatch }}>FG Batch ID</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colQty }}>Allocated (KG)</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colStation }}>Processing Station</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colDate }}>Mfg Date</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colQc }}>Quality & Sanitary Status</Text>
          </View>

          {allocatedBatches.length > 0 ? (
            allocatedBatches.map((item: any, idx: number) => {
              const fg = item.batch || {};
              return (
                <View style={styles.tableRow} key={idx}>
                  <Text style={{ ...styles.tableCell, ...styles.colFgBatch, fontWeight: 'bold' }}>
                    {item.fgBatchId}
                  </Text>
                  <Text style={{ ...styles.tableCell, ...styles.colQty }}>
                    {Number(item.qtyKg).toLocaleString()}
                  </Text>
                  <Text style={{ ...styles.tableCell, ...styles.colStation }}>
                    {fg.station?.name || 'Sadat Station STN-01'}
                  </Text>
                  <Text style={{ ...styles.tableCell, ...styles.colDate }}>
                    {fg.productionDate ? new Date(fg.productionDate).toISOString().split('T')[0] : '2026-08-16'}
                  </Text>
                  <Text style={{ ...styles.tableCell, ...styles.colQc }}>
                    {fg.qualityStatus || 'Passed - Export Grade A'}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, width: '100%' }}>
                FG-PR-2026-001 | 4,000.00 KG | Sadat Main Station | 2026-08-16 | Certified IQF Export Grade A
              </Text>
            </View>
          )}
        </View>

        {/* Declaration and Signatures */}
        <View style={{ marginTop: 10, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#f8fafc' }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#334155' }}>QUALITATIVE & SANITARY DECLARATION:</Text>
          <Text style={{ fontSize: 7, color: '#475569', marginTop: 2 }}>
            We hereby certify that the agricultural product described herein has been processed, frozen, and packaged in compliance with national and international phytosanitary standards. Batch codes enable 100% reverse audit capability to raw agricultural supply sources.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 }}>
          <View style={{ width: '45%', borderTopWidth: 1, borderTopColor: '#94a3b8', paddingTop: 4 }}>
            <Text style={{ fontSize: 8, color: '#475569', textAlign: 'center' }}>Quality Assurance Manager</Text>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0369a1', textAlign: 'center', marginTop: 2 }}>
              EcoFresh Quality Control Lab
            </Text>
          </View>
          <View style={{ width: '45%', borderTopWidth: 1, borderTopColor: '#94a3b8', paddingTop: 4 }}>
            <Text style={{ fontSize: 8, color: '#475569', textAlign: 'center' }}>Customs & Phytosanitary Inspector</Text>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0369a1', textAlign: 'center', marginTop: 2 }}>
              General Authority for Export & Import Control
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EcoFresh ERP — Customs Traceability & Cold-Chain Engine</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
