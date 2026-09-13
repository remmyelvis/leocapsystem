import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STATIC_KEY_BYTES = new Uint8Array([
  102, 221, 14, 87, 23, 114, 55, 99, 131, 2, 45, 112, 11, 74, 98, 224,
  12, 101, 8, 99, 17, 85, 33, 44, 150, 77, 88, 19, 21, 230, 241, 11
]);

const STATIC_IV = new Uint8Array([
  45, 12, 99, 101, 23, 56, 78, 12, 45, 87, 34, 11
]);


async function encryptPayload(text: string): Promise<{ base64: string; binary: string }> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      STATIC_KEY_BYTES,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: STATIC_IV },
      key,
      encoded
    );

    const buffer = new Uint8Array(encrypted);


    let binaryStr = "";
    for (let i = 0; i < buffer.length; i++) {
      binaryStr += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binaryStr);


    let binary = "";
    for (let i = 0; i < buffer.length; i++) {
      binary += buffer[i].toString(2).padStart(8, '0');
    }
    return { base64, binary };
  } catch (e) {

    const b64 = btoa(text);
    let bin = "";
    for (let i = 0; i < text.length; i++) {
      bin += text.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return { base64: b64, binary: bin };
  }
}


function binaryToZeroWidth(binary: string): string {
  let zw = "";
  for (const bit of binary) {
    if (bit === "0") {
      zw += "\u200B\u200C";
    } else {
      zw += "\u200D\uFEFF";
    }
  }
  return zw;
}

export function useSessionMetrics() {
  const { user } = useAuth();

  useEffect(() => {
    let commentNode: Comment | null = null;
    let isMounted = true;

    async function applyTelemetry() {
      if (!user) {
        cleanup();
        return;
      }

      const date = new Date().toISOString().split('T')[0];
      const payload = `${user.email || 'unknown'}|${user.role || 'User'}|${date}`;

      const { base64, binary } = await encryptPayload(payload);

      if (!isMounted) return;


      const zwString = binaryToZeroWidth(binary);
      if (!document.title.includes("\u200B")) {
        document.title = zwString + document.title;
      }


      document.documentElement.setAttribute('data-telemetry-id', base64);


      if (!window.hasOwnProperty('__sm')) {
        Object.defineProperty(window, '__sm', {
          value: {
            id: base64,
            ts: Date.now()
          },
          writable: false,
          configurable: true,
          enumerable: false,
        });
      }


      commentNode = document.createComment(` tm:${base64} `);
      document.head.prepend(commentNode);
    }

    function cleanup() {

      if (document.title.includes("\u200B")) {
        document.title = document.title.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
      }


      document.documentElement.removeAttribute('data-telemetry-id');


      if (window.hasOwnProperty('__sm')) {
        delete (window as any).__sm;
      }


      if (commentNode && commentNode.parentNode) {
        commentNode.parentNode.removeChild(commentNode);
      }
    }

    applyTelemetry();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [user?.email, user?.role]);
}
