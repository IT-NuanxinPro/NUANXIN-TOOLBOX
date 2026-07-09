import { lazy, Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { ToolSkeleton } from './components/ToolSkeleton';
import type { ToolComponentProps } from './types';

type ToolComponent = LazyExoticComponent<ComponentType<ToolComponentProps>>;

const SVGConverter = lazy(() => import('./components/SVGConverter').then((m) => ({ default: m.SVGConverter })));
const JsonYaml = lazy(() => import('./components/JsonYaml').then((m) => ({ default: m.JsonYaml })));
const Base64Codec = lazy(() => import('./components/Base64Codec').then((m) => ({ default: m.Base64Codec })));
const TimestampHelper = lazy(() => import('./components/TimestampHelper').then((m) => ({ default: m.TimestampHelper })));
const UuidGenerator = lazy(() => import('./components/UuidGenerator').then((m) => ({ default: m.UuidGenerator })));
const RegexTester = lazy(() => import('./components/RegexTester').then((m) => ({ default: m.RegexTester })));
const OpsConfigs = lazy(() => import('./components/OpsConfigs').then((m) => ({ default: m.OpsConfigs })));
const HashCrypto = lazy(() => import('./components/HashCrypto').then((m) => ({ default: m.HashCrypto })));
const TextEditor = lazy(() => import('./components/TextEditor').then((m) => ({ default: m.TextEditor })));
const ColorBox = lazy(() => import('./components/ColorBox').then((m) => ({ default: m.ColorBox })));
const QrCodeGenerator = lazy(() => import('./components/QrCodeGenerator').then((m) => ({ default: m.QrCodeGenerator })));
const RsaGenerator = lazy(() => import('./components/RsaGenerator').then((m) => ({ default: m.RsaGenerator })));
const AesCrypto = lazy(() => import('./components/AesCrypto').then((m) => ({ default: m.AesCrypto })));
const JwtDebugger = lazy(() => import('./components/JwtDebugger').then((m) => ({ default: m.JwtDebugger })));
const UrlCodec = lazy(() => import('./components/UrlCodec').then((m) => ({ default: m.UrlCodec })));
const CronParser = lazy(() => import('./components/CronParser').then((m) => ({ default: m.CronParser })));
const JsonDiff = lazy(() => import('./components/JsonDiff').then((m) => ({ default: m.JsonDiff })));
const RandomPassword = lazy(() => import('./components/RandomPassword').then((m) => ({ default: m.RandomPassword })));
const SubnetCalculator = lazy(() => import('./components/SubnetCalculator').then((m) => ({ default: m.SubnetCalculator })));
const UserAgentParser = lazy(() => import('./components/UserAgentParser').then((m) => ({ default: m.UserAgentParser })));
const PlaceholderGenerator = lazy(() => import('./components/PlaceholderGenerator').then((m) => ({ default: m.PlaceholderGenerator })));
const CodeDiffEditor = lazy(() => import('./components/CodeDiffEditor').then((m) => ({ default: m.CodeDiffEditor })));
const LinuxCommandHelper = lazy(() => import('./components/LinuxCommandHelper').then((m) => ({ default: m.LinuxCommandHelper })));
const HttpStatusHelper = lazy(() => import('./components/HttpStatusHelper').then((m) => ({ default: m.HttpStatusHelper })));
const SqlFormatter = lazy(() => import('./components/SqlFormatter').then((m) => ({ default: m.SqlFormatter })));
const JsonToTs = lazy(() => import('./components/JsonToTs').then((m) => ({ default: m.JsonToTs })));
const CssUnitConverter = lazy(() => import('./components/CssUnitConverter').then((m) => ({ default: m.CssUnitConverter })));
const CurlConverter = lazy(() => import('./components/CurlConverter').then((m) => ({ default: m.CurlConverter })));
const CodePlayground = lazy(() => import('./components/CodePlayground').then((m) => ({ default: m.CodePlayground })));
const VuePlayground = lazy(() => import('./components/VuePlayground').then((m) => ({ default: m.VuePlayground })));
const FaviconGenerator = lazy(() => import('./components/FaviconGenerator').then((m) => ({ default: m.FaviconGenerator })));
const HttpRequestTester = lazy(() => import('./components/HttpRequestTester').then((m) => ({ default: m.HttpRequestTester })));
const CssGradientGenerator = lazy(() => import('./components/CssGradientGenerator').then((m) => ({ default: m.CssGradientGenerator })));

export const TOOL_COMPONENTS: Record<string, ToolComponent> = {
  'svg-converter': SVGConverter,
  'json-yaml': JsonYaml,
  base64: Base64Codec,
  timestamp: TimestampHelper,
  'uuid-gen': UuidGenerator,
  regex: RegexTester,
  'ops-configs': OpsConfigs,
  'hash-crypto': HashCrypto,
  'text-editor': TextEditor,
  'color-box': ColorBox,
  'qrcode-gen': QrCodeGenerator,
  'rsa-generator': RsaGenerator,
  'aes-crypto': AesCrypto,
  'jwt-debugger': JwtDebugger,
  'url-codec': UrlCodec,
  'cron-parser': CronParser,
  'json-diff': JsonDiff,
  'random-password': RandomPassword,
  'subnet-calculator': SubnetCalculator,
  'user-agent': UserAgentParser,
  'image-placeholder': PlaceholderGenerator,
  'code-diff': CodeDiffEditor,
  'linux-cmd-helper': LinuxCommandHelper,
  'http-status-helper': HttpStatusHelper,
  'sql-formatter': SqlFormatter,
  'json-to-ts': JsonToTs,
  'css-unit-converter': CssUnitConverter,
  'curl-converter': CurlConverter,
  'code-playground': CodePlayground,
  'vue-playground': VuePlayground,
  'favicon-generator': FaviconGenerator,
  'http-request-tester': HttpRequestTester,
  'css-gradient-generator': CssGradientGenerator,
};

interface ToolScreenProps {
  toolId: string;
  toolTitle?: string;
  onRecordUsage: (toolId: string) => void;
}

export function ToolScreen({ toolId, toolTitle, onRecordUsage }: ToolScreenProps) {
  const Tool = TOOL_COMPONENTS[toolId];

  if (!Tool) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        该小工具正在紧急研发中，敬请期待！
      </div>
    );
  }

  return (
    <div key={toolId} className="animate-tool-enter">
      <Suspense fallback={<ToolSkeleton toolTitle={toolTitle} />}>
        <Tool onRecordUsage={() => onRecordUsage(toolId)} />
      </Suspense>
    </div>
  );
}
