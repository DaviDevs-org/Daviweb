import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { MoceanAdapter } from './infrastructure/mocean.adapter';
import { SendSmsCancelationUsecase } from './application/send-sms-cancelation.usecase';
import { Appointment } from './domain/appointment.entity';

const smsAdapter = new MoceanAdapter();
const sendSmsUsecase = new SendSmsCancelationUsecase(smsAdapter);

/**
 * Cloud Function starts when an appointment is created
 * Firestore Route: tenants/{tenantId}/citas/{citaId}
 */
export const sendSmsCancelation = onDocumentCreated(
  {
    document: 'tenants/{tenantId}/citas/{citaId}',
    region: 'europe-west1',
    secrets: ['MOCEAN_API_KEY'],
  },
  async (event) => {
    // 1. Obtain appointment data
    const snapshot = event.data;
    if (!snapshot) {
      console.warn('⚠️ No hay datos en el snapshot');
      return;
    }

    const appointment = snapshot.data() as Appointment;
    const citaId = event.params.citaId;
    const tenantId = event.params.tenantId;

    console.log(`📩 Procesando cita ${citaId} del tenant ${tenantId}`);

    // 2. Validate required fields
    if (!appointment.phone) {
      console.error('❌ Falta teléfono en la cita');
      return;
    }

    if (!appointment.datetime) {
      console.error('❌ Falta fecha en la cita');
      return;
    }

    // Format date for SMS
    const datetime =
      appointment.datetime instanceof Date
        ? appointment.datetime
        : new Date(appointment.datetime);
    const formatedDate = datetime.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const localName = tenantId;

    // Generate cancellation link
    const cancelationToken = appointment.cancelationToken || citaId;
    const cancelationLink = `https://tuapp.com/cancelar/${cancelationToken}`;

    // 3. Send SMS via use case
    try {
      await sendSmsUsecase.execute(
        appointment.phone,
        formatedDate,
        localName,
        cancelationLink
      );
      console.log(`✅ SMS enviado a ${appointment.phone}`);
    } catch (error) {
      console.error('❌ Error enviando SMS:', error);
    }
  }
);
