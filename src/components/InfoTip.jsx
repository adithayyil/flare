import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Info } from 'lucide-react-native';
import BottomSheet from './BottomSheet';

export default function InfoTip({ title, children, style }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.5} style={style}>
        <Info size={14} color="#A8969F" strokeWidth={1.5} />
      </TouchableOpacity>
      <BottomSheet visible={open} onDismiss={() => setOpen(false)} title={title}>
        {children}
      </BottomSheet>
    </>
  );
}
