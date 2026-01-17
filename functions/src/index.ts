import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { MoceanAdapter } from './infrastructure/mocean.adapter';
import { SendSmsCancelationUsecase } from './application/send-sms-cancelation.usecase';
import { Appointment } from './domain/appointment.entity';
import { Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { TenantService } from '../../src/app/config/tenant.service';
import { inject } from '@angular/core';

admin.initializeApp();

const smsAdapter = new MoceanAdapter();
const sendSmsUsecase = new SendSmsCancelationUsecase(smsAdapter);
const tenantService = inject(TenantService);

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
    if (!tenantService.getTenantConfig().features.enableSms) {
      return;
    } else {
      // 1. Obtain appointment data
      const snapshot = event.data;
      if (!snapshot) {
        console.warn('⚠️ No hay datos en el snapshot');
        return;
      }

      const appointment = snapshot.data() as Appointment;
      const appointmentId = event.params.citaId;
      const tenantId = event.params.tenantId;

      console.log(`📩 Procesando cita ${appointmentId} del tenant ${tenantId}`);

      // 2. Validate required fields
      if (!appointment.phone) {
        console.error('❌ Falta teléfono en la cita');
        return;
      }

      let phoneNumber = appointment.phone.trim();
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+34' + phoneNumber; // Assuming default country code +34
        console.warn(`⚠️ Teléfono sin prefijo, añadiendo +34: ${phoneNumber}`);
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

      const localName = tenantId;

      // Expiration time for cancellation link
      const appointmentDate = datetime; // Ya lo tienes convertido arriba
      const expirationTime = appointmentDate.getTime() - 24 * 60 * 60 * 1000; // 24 hours before appointment

      // Generate cancellation token
      const tokenData = {
        t: tenantId,
        a: appointmentId,
        e: expirationTime,
      };

      const cancelationToken = Buffer.from(JSON.stringify(tokenData)).toString(
        'base64url',
      );

      // Obtener dominio del tenant desde Firestore
      const tenantDoc = await admin
        .firestore()
        .collection('tenants')
        .doc(tenantId)
        .get();

      // Generate cancellation link
      const domain = tenantDoc.data()?.domain || 'http://localhost:4200';
      const cancelationLink = `${domain}/cancelar/${cancelationToken}`;

      // 3. Send SMS via use case
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
    }
  },
);
