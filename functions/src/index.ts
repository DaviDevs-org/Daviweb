// functions/src/index.ts (o donde tengas tus functions)
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface AppointmentData {
  date: string;
  time: string;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
}

export const addAppointment = functions.https.onCall(async (data, context) => {
  try {
    console.log('addAppointment invocada. data:', JSON.stringify(data));

    const payload = data as unknown as AppointmentData;
    const { date, time, name, email, phone, description } = payload || {};

    if (!date || !time || !name) {
      console.warn('Validación fallida en addAppointment, campos:', { date, time, name });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Faltan campos obligatorios (date, time, name).'
      );
    }

    const db = admin.firestore();

    const appointmentRef = await db
      .collection('pruebas')
      .doc('data')
      .collection('appointments')
      .add({
        date,
        time,
        name,
        email: email || null,
        phone: phone || null,
        description: description || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // opcional: añadir reserved slot si lo quieres
    await db
      .collection('pruebas')
      .doc('data')
      .collection('reservedSlots')
      .add({
        date,
        time,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log('addAppointment: guardada appointmentId=', appointmentRef.id);
    return { success: true, appointmentId: appointmentRef.id };
  } catch (err: any) {
    console.error('addAppointment: error interno:', err);
    // si ya es HttpsError, re-lanzar; si no, lanzar error genérico:
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Error interno al guardar la cita.');
  }
});
