/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is not an HTML img */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type {
  Prescription,
  PrescriptionItem,
  Tenant,
  Patient,
  UserProfile,
} from '@/db/schema';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#888',
    paddingBottom: 8,
    marginBottom: 12,
  },
  cabinetTitle: { fontSize: 14, fontWeight: 'bold' },
  doctorLine: { fontSize: 10, color: '#444', marginTop: 2 },
  cabinetMeta: { fontSize: 9, color: '#666', marginTop: 2 },
  patientBlock: { marginBottom: 12 },
  patientLine: { fontSize: 11, marginBottom: 2 },
  date: { fontSize: 10, color: '#444', marginBottom: 12 },
  itemBlock: { marginBottom: 10, paddingLeft: 12 },
  itemHeader: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  itemSub: { fontSize: 10, color: '#333', marginBottom: 1 },
  signatureBlock: { marginTop: 32, alignItems: 'flex-end' },
  signatureLabel: { fontSize: 10, color: '#444', marginBottom: 4 },
  signatureImg: { width: 120, height: 60, objectFit: 'contain' },
  stampImg: { width: 80, height: 80, objectFit: 'contain', marginTop: 8 },
  footer: {
    fontSize: 8,
    color: '#888',
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
  },
});

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function ageFromDob(dob: string, now: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month < m || (month === m && day < d)) age -= 1;
  return age;
}

export function PrescriptionPdfDocument({
  tenant,
  doctor,
  patient,
  prescription,
  items,
}: {
  tenant: Tenant;
  doctor: Pick<UserProfile, 'fullName'>;
  patient: Pick<Patient, 'firstName' | 'lastName' | 'dateOfBirth' | 'gender'>;
  prescription: Prescription;
  items: PrescriptionItem[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            {tenant.logoUrl ? (
              <Image src={tenant.logoUrl} style={{ width: 90, height: 60, objectFit: 'contain' }} />
            ) : null}
            <View>
              <Text style={styles.cabinetTitle}>{tenant.name}</Text>
              <Text style={styles.doctorLine}>Dr. {doctor.fullName}</Text>
              {tenant.address ? <Text style={styles.cabinetMeta}>{tenant.address}</Text> : null}
              {tenant.phone ? <Text style={styles.cabinetMeta}>Tél: {tenant.phone}</Text> : null}
              {tenant.rpmNumber ? (
                <Text style={styles.cabinetMeta}>RPM: {tenant.rpmNumber}</Text>
              ) : null}
              {tenant.cnomNumber ? (
                <Text style={styles.cabinetMeta}>CNOM: {tenant.cnomNumber}</Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={styles.date}>{fmtDate(prescription.issuedAt)}</Text>
          </View>
        </View>

        <View style={styles.patientBlock}>
          <Text style={styles.patientLine}>
            {patient.lastName} {patient.firstName} — {ageFromDob(patient.dateOfBirth)} ans
            {patient.gender === 'm' ? ' (H)' : ' (F)'}
          </Text>
        </View>

        {items.map((it, idx) => (
          <View key={it.id} style={styles.itemBlock} wrap={false}>
            <Text style={styles.itemHeader}>
              {idx + 1}. {it.medicationLabelSnapshot}
            </Text>
            {it.posologie ? <Text style={styles.itemSub}>Posologie : {it.posologie}</Text> : null}
            {it.duration ? <Text style={styles.itemSub}>Durée : {it.duration}</Text> : null}
            {it.quantity ? <Text style={styles.itemSub}>Quantité : {it.quantity}</Text> : null}
            {it.instructions ? (
              <Text style={styles.itemSub}>Notes : {it.instructions}</Text>
            ) : null}
          </View>
        ))}

        {prescription.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.itemSub}>{prescription.notes}</Text>
          </View>
        ) : null}

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Signature et cachet</Text>
          {tenant.signatureUrl ? (
            <Image src={tenant.signatureUrl} style={styles.signatureImg} />
          ) : null}
          {tenant.stampUrl ? <Image src={tenant.stampUrl} style={styles.stampImg} /> : null}
        </View>

        <Text style={styles.footer}>
          Document généré par Doctopus — à imprimer, signer et tamponner avant remise au patient.
        </Text>
      </Page>
    </Document>
  );
}
