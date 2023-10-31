"use client";

import { useChat } from "ai/react";
import { HiSpeakerWave } from "react-icons/hi2";
import { useState, useEffect, ChangeEvent, MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import { IoSend } from "react-icons/io5";
import { FaGithub } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import { AiFillInfoCircle } from "react-icons/ai";
import { Dialog } from "@headlessui/react";
import Modal from "@/components/Modal";
import rehypeRaw from "rehype-raw";
import { useKuromoji } from "../hooks/useKuromoji";
import { toast } from "sonner";
import Onboarding from "@/components/Onboarding";
import TextareaAutosize from "react-textarea-autosize";

const SYSTEM_ROLES = [
  "ソクラテスに対応する家庭教師AI",
  "絵文字だけで返信するAI",
  "プログラミングの専門家",
  "ジョークを言う",
];

interface MessageProps {
  message: {
    id: string;
    content: string;
    role: "assistant" | "user" | "function" | "system";
  };
  isLoading: boolean;
  isLast: boolean;
  kids: boolean;
  kidContent?: string;
}

function Message({
  message,
  isLoading,
  isLast,
  kids,
  kidContent,
}: MessageProps) {
  return (
    <div
      className={`mb-8 flex ${
        message.role === "assistant" ? "justify-start" : "justify-end"
      }`}
    >
      {message.role === "assistant" ? (
        <div className="flex items-start justify-start">
          <div className="mr-3 text-4xl flex justify-center bg-white rounded-xl p-2">
            {isLoading && isLast ? (
              <div className="animate-blink">🤖</div>
            ) : (
              <div>🤖</div>
            )}
          </div>
          <ReactMarkdown
            className="prose flex flex-wrap max-w-[500px] after:absolute mt-[-3px] rounded-2xl bg-white py-2 px-4"
            rehypePlugins={[rehypeRaw]}
          >
            {kids && kidContent ? kidContent : message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="prose flex flex-wrap max-w-[500px] after:absolute mt-[-3px] rounded-2xl bg-white py-2 px-4">
          {message.content}
        </div>
      )}
    </div>
  );
}

export const isKanji = (ch: string): boolean => {
  const unicode = ch.charCodeAt(0);
  return unicode >= 0x4e00 && unicode <= 0x9faf;
};

export const kanaToHira = (str: string) =>
  str.replace(/[\u30a1-\u30f6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );

type Message = {
  content: string;
  role: "system" | "user" | "assistant" | "function";
};

export default function Chat() {
  const [system, setSystem] = useState<string | null>(null);
  const [api, setApi] = useState<string | null>(null);
  const [onboarding, setIsOnboarding] = useState(false);
  const [randomRole, setRandomRole] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [voice, setIsVoice] = useState(false);
  const [lastReadPosition, setLastReadPosition] = useState(0);

  const [isSystemMessageModified, setIsSystemMessageModified] = useState(false);
  const [kids, setIsKids] = useState(false);
  const [rubyKids, setRubyKids] = useState<Message[]>([]);

  function openModal() {
    setIsOpen(true);
  }

  const initializeStoredData = () => {
    const storedSystem = localStorage.getItem("systemMessage");
    const storedApiKey = localStorage.getItem("api_key");
    const isFirstTime = !localStorage.getItem("onboardingCompleted");

    if (storedSystem) setSystem(storedSystem);
    if (storedApiKey) setApi(storedApiKey);
    if (isFirstTime) setIsOnboarding(true);
  };

  const { isTokenizerReady, tokenizer } = useKuromoji();

  useEffect(initializeStoredData, []);

  const handleOnResetChat = (e: MouseEvent<HTMLButtonElement>) => {
    if (messages.length === 0) {
      return; // チャットが空の場合は何もしない
    }

    const confirmed = window.confirm("チャットをすべてリセットしますか？");
    if (confirmed) {
      setMessages([]);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * SYSTEM_ROLES.length);
      setRandomRole(SYSTEM_ROLES[randomIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSystemChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSystem(value);
    localStorage.setItem("systemMessage", value);
    setIsSystemMessageModified(true);
  };

  const closeOnboarding = () => {
    setIsOnboarding(false);
    localStorage.setItem("onboardingCompleted", "true");
  };

  const {
    messages,
    input,
    handleInputChange,
    isLoading,
    setMessages,
    handleSubmit,
    setInput,
  } = useChat({
    body: {
      system: system,
      api: api,
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const startVoiceInput = () => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      setIsVoice(true);
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = "ja-JP"; // 日本語に設定
      recognition.interimResults = false; // 結果が確定したときだけイベントをトリガー
      recognition.maxAlternatives = 1; // 返す結果の最大数

      recognition.start();

      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setInput(speechResult); // ここで音声入力の結果をsetInputでセット

        setIsVoice(false);
      };

      recognition.onerror = (event) => {
        console.error("音声認識エラー:", event.error);
      };
    } else {
      alert("ご利用のブラウザは音声入力に対応していません。");
    }
  };

  useEffect(() => {
    const generateRuby = async () => {
      if (tokenizer) {
        const newRubyKids: Message[] = [];
        for (const message of messages) {
          const text =
            message.role === "user" ? message.content : message.content || "";

          let rubyText = "";
          text.split("`").forEach((segment, index) => {
            if (index % 2 === 0) {
              // Outside a code block
              const tokens = tokenizer.tokenize(segment);
              rubyText += tokens
                .map((token) => {
                  const surface = token.surface_form;
                  const reading = token.reading;
                  if (!reading || message.role === "user") {
                    return surface;
                  }
                  const hiraReading = kanaToHira(reading);
                  if (surface.split("").some(isKanji)) {
                    return `<ruby>${surface}<rt>${hiraReading}</rt></ruby>`;
                  } else {
                    return surface;
                  }
                })
                .join("");
            } else {
              // Inside a code block
              rubyText += "`" + segment + "`";
            }
          });

          newRubyKids.push({ role: message.role, content: rubyText });
          setRubyKids(newRubyKids);
        }
      }
    };
    generateRuby();
  }, [tokenizer, messages]);

  function closeModal() {
    if (isSystemMessageModified && messages.length > 0) {
      const resetChat = window.confirm(
        "システムメッセージが変更されました。過去のメッセージに引きずられずに変更を適用しやすいものにするため、会話履歴をリセットしますか？"
      );
      if (resetChat) {
        setMessages([]);
      }
    }
    setIsOpen(false);
    setIsSystemMessageModified(false);
  }

  function Apikey(value: string) {
    setApi(value);
    localStorage.setItem("api_key", value);
  }

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const newContent = lastMessage.content.substring(lastReadPosition);
        speakText(newContent);
        setLastReadPosition(lastMessage.content.length);
      }
    }
  }, [messages, lastReadPosition]);

  const speakText = (text: string) => {
    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    speechSynthesis.speak(utterance);
  };

  return (
    <>
      <div className="mx-auto my-5 w-full max-w-screen-xl px-4 md:px-8">
        <div className="flex gap-x-4 items-center justify-end">
          <button
            type="button"
            onClick={openModal}
            className="rounded-md shadow flex items-center bg-blue-400 px-4 py-2 font-bold text-white"
          >
            <FiSettings className="mr-1" />
            設定
          </button>
        </div>
        <div className="pt-20">
          {messages.length === 0 ? (
            <div className="text-center space-y-5 mx-auto">
              <div className="text-8xl">🤖</div>
              <h1 className="text-3xl font-bold">
                アクセシビリティに特化したChatGPTクライアント
              </h1>
              <div className="flex justify-center items-center">
                <a
                  className="flex items-center font-medium gap-2"
                  href="https://github.com/yutakobayashidev/chatgpt-voice"
                >
                  <FaGithub className="text-3xl" /> GitHub
                </a>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  isLoading={isLoading}
                  isLast={i === messages.length - 1}
                  kids={kids}
                  kidContent={rubyKids[i]?.content}
                />
              ))}
            </>
          )}
        </div>
        <div className="fixed mx-auto my-5 w-full max-w-screen-xl px-4 md:px-8 inset-x-0 bottom-0 py-4">
          <form className="flex items-center gap-x-5" onSubmit={handleSubmit}>
            <input
              value={input}
              className="p-4 border flex-1 rounded-xl w-full"
              placeholder="ここに質問したい内容を入力してください。"
              onChange={handleInputChange}
            />
            <button
              disabled={isLoading || input === ""}
              className="bg-blue-500 disabled:bg-gray-300 rounded-lg p-4 text-white flex justify-center text-center"
            >
              <IoSend />
            </button>
          </form>
          <div className="md:flex md:items-center md:gap-x-3 gap-y-4 md:gap-y-0 mt-5">
            <button
              className="px-4 font-bold rounded-full py-2 text-white disabled:bg-gray-300 bg-green-400"
              disabled={!isTokenizerReady}
              onClick={() => setIsKids(!kids)}
            >
              {kids ? "ふりがなを非表示" : "ふりがなを表示"}
            </button>
            <button
              className="disabled:bg-gray-300 px-4 font-bold rounded-full py-2 text-white bg-red-400"
              onClick={(e: MouseEvent<HTMLButtonElement>) =>
                handleOnResetChat(e)
              }
              disabled={messages.length === 0}
            >
              チャットをリセット
            </button>
            <button
              onClick={startVoiceInput}
              className="px-4 flex items-center gap-x-2 font-bold rounded-full py-2 text-white bg-blue-600"
            >
              <HiSpeakerWave />
              {voice ? "音声入力をストップ" : "音声入力を開始"}
            </button>
          </div>
        </div>
      </div>
      <Modal closeModal={closeModal} isOpen={isOpen}>
        <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
          <Dialog.Title
            as="h3"
            className="text-3xl mb-5 font-bold text-center leading-6 text-gray-900"
          >
            設定
          </Dialog.Title>
          <p className="flex mb-3 items-start text-xs text-gray-600 font-bold">
            <AiFillInfoCircle className="mr-1 text-blue-400 text-xl" />
            設定はブラウザのローカルストレージに保存され、OpenAIへのアクセスのみに使用されます。
          </p>
          <div>
            <label className="font-bold mb-2 block">システムメッセージ</label>
            <p className="text-sm text-gray-500 block mb-2">
              AIに求める役割をテキストで割り当てられます。
            </p>
            <TextareaAutosize
              value={system || ""}
              onChange={handleSystemChange}
              className="w-full block 200 px-2 py-2 mb-2 rounded-md border border-gray-300"
              placeholder="AIに持たせたい役割を入力してください "
              minRows={2}
            />
            <label className="font-bold mb-2 block">OpenAI APIキー</label>
            <p className="text-sm text-gray-500 block mb-2">
              APIキーを入力することで、上限なく (OpenAI API自体の制限はあり)
              ことのサイト上でチャットすることができます。
            </p>
          </div>
          <input
            value={api || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              Apikey(e.target.value)
            }
            className="w-full block 200 px-2 py-1.5 rounded-md border border-gray-300"
            placeholder="OpenAI APIを入力してください..."
          />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={closeModal}
            >
              閉じる
            </button>
          </div>
        </Dialog.Panel>
      </Modal>
      <Onboarding
        isOpen={onboarding}
        closeOnboarding={closeOnboarding}
        system={system}
        randomRole={randomRole}
        handleSystemChange={handleSystemChange}
      />
    </>
  );
}
