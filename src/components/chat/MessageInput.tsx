import React, { useState, useRef } from 'react';
import { sendOutline, addOutline, happyOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import './MessageInput.css';

interface Props {
  channelName?: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<Props> = ({ channelName, onSend, disabled = false }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = value.trim().length === 0;

  const handleSend = async () => {
    if (isEmpty || disabled) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
    onSend(value.trim());
    setValue('');
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-grow up to 10 lines (~220px)
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
  };

  return (
    <div className="flx-message-input">
      <button className="flx-message-input__btn flx-pressable" title="Attach file" disabled={disabled}>
        <IonIcon icon={addOutline} />
      </button>

      <textarea
        ref={textareaRef}
        className="flx-message-input__textarea"
        placeholder={channelName ? `Message #${channelName}` : 'Message...'}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
      />

      <button className="flx-message-input__btn flx-pressable" title="Emoji" disabled={disabled}>
        <IonIcon icon={happyOutline} />
      </button>

      {/* Send button only shown when there is content — Ivory detail */}
      {!isEmpty && (
        <button
          className="flx-message-input__send flx-pressable"
          onClick={handleSend}
          disabled={disabled}
          title="Send message"
        >
          <IonIcon icon={sendOutline} />
        </button>
      )}
    </div>
  );
};
