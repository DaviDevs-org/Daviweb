import { SmsRepository } from '../domain/sms.repository';

export class SendSmsCancelationUsecase {
  constructor(private smsRepository: SmsRepository) {}

  async execute(
    phoneNumber: string,
    date: string,
    localName: string,
    cancelationLink: string
  ): Promise<void> {
    const message = `Tu cita ${date} en ${localName} ha sido reservada correctamente. \n\Si deseas cancelar pulsa aquí: ${cancelationLink}`;
    await this.smsRepository.sendSms(phoneNumber, message);
  }
}
