import Modal from "@/components/Modal";
import { Dialog } from "@headlessui/react";
import TextareaAutosize from "react-textarea-autosize";
import { AiFillCheckCircle } from "react-icons/ai";

interface OnboardingModalProps {
  isOpen: boolean;
  closeOnboarding: () => void;
  system: string | null;
  randomRole: string;
  handleSystemChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function Onboarding({
  isOpen,
  closeOnboarding,
  system,
  randomRole,
  handleSystemChange,
}: OnboardingModalProps) {
  return (
    <Modal closeModal={closeOnboarding} isOpen={isOpen}>
      <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <Dialog.Title
          as="h3"
          className="text-3xl justify-center flex items-center mb-3 font-bold text-center leading-6 text-gray-900"
        >
          <img
            width={35}
            height={35}
            className="mr-1"
            src="https://media.giphy.com/media/hvRJCLFzcasrR4ia7z/giphy.gif"
            alt="Hi there!"
          />
          ようこそ！
        </Dialog.Title>
        <p className="mb-3 text-center text-gray-600">
          アクセシビリティに特化した日本語のChatGPTクライアントです。まずはシステムメッセージを設定してください。いつでも変更できます。
        </p>
        <div>
          <label className="font-bold mb-2 block">システムロール</label>
          <p className="text-sm text-gray-500 block mb-2">
            AIに求める役割をテキストで割り当てられます。
          </p>
          <div className="relative rounded-xl flex px-2 py-2 mb-5 border border-gray-300">
            {!system && (
              <div className="absolute select-none text-gray-800/20">
                {randomRole}
              </div>
            )}
            <TextareaAutosize
              value={system || ""}
              onChange={handleSystemChange}
              className="w-full z-10 bg-transparent focus:outline-none 200"
              minRows={2}
            />
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={closeOnboarding}
            className="flex bg-blue-400 shadow font-bold text-white px-4 py-2 rounded-lg items-center"
          >
            <AiFillCheckCircle className="mr-1 text-xl" />
            オンボーディングを完了する
          </button>
        </div>
      </Dialog.Panel>
    </Modal>
  );
}
