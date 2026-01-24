import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { MoceanAdapter } from './infrastructure/mocean.adapter';
import { SendSmsCancelationUsecase } from './application/send-sms-cancelation.usecase';
import { Appointment } from './domain/appointment.entity';
import { Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();

const smsAdapter = new MoceanAdapter();
const sendSmsUsecase = new SendSmsCancelationUsecase(smsAdapter);

function normalizePhoneNumber(raw: string, defaultCountryCallingCode = '34'): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value) return null;

  // Convert leading 00 to + (common international prefix)
  if (value.startsWith('00')) {
    value = '+' + value.slice(2);
  }

  // Keep leading + if present, strip everything else that's not a digit
  if (value.startsWith('+')) {
    const digits = value.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }

  // National / partially formatted input
  const nationalDigits = value.replace(/\D/g, '');
  if (!nationalDigits) return null;

  return `+${defaultCountryCallingCode}${nationalDigits}`;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Cloud Function starts when an appointment is created
 * Firestore Route: tenants/{tenantId}/citas/{citaId}
 */
export const sendSmsCancelation = onDocumentCreated(
  {
    document: 'hairdressers/{tenantId}/appointments/{citaId}',
    region: 'europe-west1',
    secrets: ['MOCEAN_API_KEY'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.warn('⚠️ No hay datos en el snapshot');
      return;
    }

    const appointment = snapshot.data() as Appointment;
    const appointmentId = event.params.citaId;
    const tenantId = event.params.tenantId;

    console.log(`📩 Procesando cita ${appointmentId} del tenant ${tenantId}`);

    // 0. Tenant feature flag (NO Angular DI in Cloud Functions)
    const tenantDoc = await admin
      .firestore()
      .collection('hairdressers')
      .doc(tenantId)
      .get();

    const tenantData = tenantDoc.data();
    const enableSms = tenantData?.features?.enableSms === true;
    if (!enableSms) {
      console.log('ℹ️ SMS deshabilitado para este tenant');
      return;
    }

    // 1. Validate required fields
    const phoneNumber = normalizePhoneNumber(appointment.phone ?? '');
    if (!phoneNumber) {
      console.error('❌ Teléfono inválido o vacío en la cita');
      return;
    }

    if (!appointment.datetime) {
      console.error('❌ Falta fecha en la cita');
      return;
    }

    // Format date for SMS
    const datetime =
      appointment.datetime instanceof Timestamp
        ? appointment.datetime.toDate()
        : typeof appointment.datetime === 'string'
          ? new Date(appointment.datetime)
          : appointment.datetime;

    const formatedDate = datetime.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const localName = tenantData?.business?.name || tenantId;

    // Expiration time for cancellation link
    const expirationTime = datetime.getTime() - 24 * 60 * 60 * 1000; // 24 hours before appointment

    // Generate cancellation token
    const tokenData = {
      t: tenantId,
      a: appointmentId,
      e: expirationTime,
    };

    const cancelationToken = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

    // Generate cancellation link
    const configuredDomain =
      tenantData?.domain || tenantData?.publicBaseUrl || tenantData?.publicUrl;
    const baseUrl = normalizeBaseUrl(configuredDomain || 'http://localhost:4200');
    const cancelationLink = `${baseUrl}/cancelar/${cancelationToken}`;

    // 2. Send SMS via use case
    try {
      await sendSmsUsecase.execute(
        phoneNumber,
        formatedDate,
        localName,
        cancelationLink,
      );
      console.log(`✅ SMS enviado a ${phoneNumber}`);
    } catch (error) {
      console.error('❌ Error enviando SMS:', error);
    }
  },
);
