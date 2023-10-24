import './App.css';
import WebSocketAsPromised from 'websocket-as-promised';

import {haloFindBridge} from '@arx-research/libhalo/api/web.js';
import {useEffect, useRef, useState} from "react";

function App() {
  const wsStartedRef = useRef(false);
  const wspRef = useRef(null);
  const [currentStateText, setCurrentStateText] = useState('Connecting with HaLo Bridge...');

  const [currentHandle, setCurrentHandle] = useState(null);

  useEffect(() => {
    async function findBridge() {
      let wsp;

      try {
        let wsAddress = await haloFindBridge();

        wsp = new WebSocketAsPromised(wsAddress, {
          packMessage: data => JSON.stringify(data),
          unpackMessage: data => JSON.parse(data),
          attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data), // attach requestId to message as `id` field
          extractRequestId: data => data && data.uid,
        });

        wsp.onUnpackedMessage.addListener(packet => {
          if (packet.event === 'ws_connected') {
            setCurrentStateText('Connected. Please tap the tag to the reader.');
          } else if (packet.event === 'handle_added') {
            setCurrentHandle(packet.data.handle);
          }
        });

        await wsp.open();
      } catch (e) {
        setCurrentStateText('Failed to connect with HaLo Bridge.');
      }

      wspRef.current = wsp;
    }

    if (!wsStartedRef.current) {
      wsStartedRef.current = true;
      findBridge();
    }
  }, []);

  useEffect(() => {
    async function processHaloTag() {
      let res = await wspRef.current.sendRequest({
        "type": "exec_halo",
        "handle": currentHandle,
        "command": {
          "name": "sign",
          "message": "010203",
          "keyNo": 1
        }
      });

      console.log('res1', res);

      let res2 = await wspRef.current.sendRequest({
        "type": "exec_halo",
        "handle": currentHandle,
        "command": {
          "name": "sign",
          "message": "04050607",
          "keyNo": 1
        }
      });

      console.log('res2', res2);
      setCurrentStateText(JSON.stringify(res) + '\n\n' + JSON.stringify(res2));
    }

    if (currentHandle) {
      processHaloTag();
    }
  }, [currentHandle]);

  return (
    <div className="App">
      <header className="App-header">
        <pre style={{whiteSpace: "pre-wrap", wordBreak: "break-all", overflowWrap: "break-word", textAlign: "left"}}>
          {currentStateText}
        </pre>
      </header>
    </div>
  );
}

export default App;
