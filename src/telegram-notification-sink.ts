import { Notification, ResourceId } from './data-model';
import { NotificationSink } from './ports';
import { Context, Telegraf } from 'telegraf';
import { Web2SubscriberRepository } from './web-subscriber.repository';

/**
 * Telegram notification
 */
export interface TelegramNotification extends Notification {
  body: string;
}

export class TelegramNotificationSink
  implements NotificationSink<TelegramNotification>
{
  private bot: Telegraf;
  constructor(
    private readonly telegramBotToken: string,
    private readonly web2SubscriberRepository: Web2SubscriberRepository,
  ) {
    this.bot = new Telegraf(telegramBotToken);
  }

  async push(notification: TelegramNotification, recipients: ResourceId[]) {
    const recipientTelegramNumbers = await this.web2SubscriberRepository.findBy(
      recipients,
    );

    // for telegram, "<username>;<chat_id>" so split and get [1] for chat_id
    const results = await Promise.allSettled(
      recipientTelegramNumbers
        .filter(({ telegramId }) => telegramId)
        .map(({ telegramId }) => {
          this.bot.telegram
            .sendMessage(telegramId!.split(';')[1], notification.body)
            .then(() => {});
        }),
    );

    const failedSends = results
      .filter((it) => it.status === 'rejected')
      .map((it) => it as PromiseRejectedResult);
    if (failedSends.length > 0) {
      console.log(
        `Failed to send dialect notification to ${
          failedSends.length
        } recipient(s), reasons: 
        ${failedSends.map((it) => it.reason)}
        `,
      );
    }

    return;
  }
}
