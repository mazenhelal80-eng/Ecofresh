import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#012d1d',
    paddingBottom: 15,
    marginBottom: 20,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 4,
  },
  companySubtitle: {
    fontSize: 8,
    color: '#555555',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#012d1d',
    textAlign: 'right',
  },
  docSubtitle: {
    fontSize: 9,
    color: '#666666',
    textAlign: 'right',
    marginTop: 3,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  box: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  boxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#012d1d',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  fieldLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  fieldValue: {
    fontSize: 8,
    color: '#111827',
  },
  table: {
    width: '100%',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#012d1d',
    padding: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#1f2937',
  },
  colDesc: { width: '45%' },
  colQty: { width: '18%', textAlign: 'right' },
  colPrice: { width: '17%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  totalBox: {
    width: '42%',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 4,
    padding: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065f46',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065f46',
  },
  bankBox: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: 10,
    marginTop: 5,
    marginBottom: 15,
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

export interface CommercialInvoiceProps {
  shipment: any;
}

export function CommercialInvoiceDoc({ shipment }: CommercialInvoiceProps) {
  const shippedQty = Number(shipment.shippedQtyKg || 0);
  const priceEur = Number(shipment.sellingPriceEur || 0);
  const totalAmount = shippedQty * priceEur;
  const currency = 'EGP';
  const dispatchDate = shipment.dispatchDate
    ? new Date(shipment.dispatchDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.companyTitle}>ECOFRESH EXPORT CO.</Text>
            <Text style={styles.companySubtitle}>Freezing & Agricultural Export Operations</Text>
            <Text style={styles.companySubtitle}>CR No: 109283 | Tax ID: 592-819-204</Text>
            <Text style={styles.companySubtitle}>Alexandria Free Zone, Egypt</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>COMMERCIAL INVOICE</Text>
            <Text style={styles.docSubtitle}>Invoice No: INV-{shipment.shipmentId}</Text>
            <Text style={styles.docSubtitle}>Date: {dispatchDate}</Text>
          </View>
        </View>

        {/* Exporter & Consignee Info */}
        <View style={styles.sectionRow}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>EXPORTER (SHIPPER)</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>
              ECOFRESH FREEZING S.A.E.
            </Text>
            <Text style={{ fontSize: 8, color: '#4b5563' }}>
              Industrial Zone 3, Sadat City, Egypt
            </Text>
            <Text style={{ fontSize: 8, color: '#4b5563' }}>Tel: +20 3 555 8900</Text>
            <Text style={{ fontSize: 8, color: '#4b5563' }}>Email: export@ecofresh.com</Text>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>CONSIGNEE (BUYER)</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>
              {shipment.customer?.name || 'SAMA IMPORT B.V.'}
            </Text>
            <Text style={{ fontSize: 8, color: '#4b5563' }}>
              Country: {shipment.customer?.country || 'Netherlands'}
            </Text>
            <Text style={{ fontSize: 8, color: '#4b5563' }}>
              Payment Terms: {shipment.customer?.paymentTerms || '30 Days Net CAD'}
            </Text>
          </View>
        </View>

        {/* Vessel & Container Logistics */}
        <View style={styles.sectionRow}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>TRANSPORT & VESSEL DETAILS</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Shipping Line:</Text>
              <Text style={styles.fieldValue}>{shipment.shippingLine || 'Maersk Line'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Booking / B/L No:</Text>
              <Text style={styles.fieldValue}>{shipment.bookingNo || 'BK-992014-EU'}</Text>
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>CONTAINER & SEAL INFO</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Container No:</Text>
              <Text style={{ ...styles.fieldValue, fontWeight: 'bold' }}>
                {shipment.containerNo || 'MSKU-987654-2'}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Customs Seal No:</Text>
              <Text style={{ ...styles.fieldValue, fontWeight: 'bold' }}>
                {shipment.sealNo || 'EG-CUS-88210'}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Order Reference:</Text>
              <Text style={styles.fieldValue}>{shipment.orderId}</Text>
            </View>
          </View>
        </View>

        {/* Goods Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colDesc }}>Description of Goods</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colQty }}>Net Qty (KG)</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colPrice }}>Unit Price ({currency})</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colTotal }}>Total Amount ({currency})</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={{ fontWeight: 'bold', fontSize: 8 }}>{shipment.productName || 'Frozen Strawberries IQF Grade A'}</Text>
              <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>
                Packaging Spec: {shipment.order?.packagingSpec || '10KG Export Carton with PE Inner Bag'}
              </Text>
            </View>
            <Text style={{ ...styles.tableCell, ...styles.colQty }}>
              {shippedQty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ ...styles.tableCell, ...styles.colPrice }}>
              {priceEur.toFixed(2)}
            </Text>
            <Text style={{ ...styles.tableCell, ...styles.colTotal, fontWeight: 'bold' }}>
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Total Summary */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Subtotal:</Text>
              <Text style={styles.fieldValue}>{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Freight & Insurance:</Text>
              <Text style={styles.fieldValue}>As per Contract</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#10b981', marginVertical: 3 }} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL DUE:</Text>
              <Text style={styles.totalValue}>
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </Text>
            </View>
          </View>
        </View>

        {/* Banking Details */}
        <View style={styles.bankBox}>
          <Text style={styles.bankTitle}>PAYMENT REMITTANCE BANK DETAILS</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              <Text style={styles.fieldLabel}>Bank Name:</Text>
              <Text style={styles.fieldValue}>Commercial International Bank (CIB Egypt)</Text>
              <Text style={styles.fieldLabel}>Branch:</Text>
              <Text style={styles.fieldValue}>Corporate Banking Center, Cairo</Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={styles.fieldLabel}>SWIFT Code:</Text>
              <Text style={{ ...styles.fieldValue, fontWeight: 'bold' }}>CIBEEGCX</Text>
              <Text style={styles.fieldLabel}>IBAN Account ({currency}):</Text>
              <Text style={{ ...styles.fieldValue, fontWeight: 'bold' }}>EG84001000000000034820194</Text>
            </View>
          </View>
        </View>

        {/* Signatures & Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
          <View style={{ width: '40%', borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 4 }}>
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'center' }}>Authorized Signature & Stamp</Text>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#012d1d', textAlign: 'center', marginTop: 2 }}>
              ECOFRESH EXPORT DEPT.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EcoFresh ERP — Official Commercial Document Engine</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
