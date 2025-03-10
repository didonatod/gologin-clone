import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Card,
  CardContent,
  CardActions,
  Avatar,
  ListItemAvatar,
  Paper,
  InputAdornment,
  RadioGroup,
  Radio,
  Slider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ComputerIcon from '@mui/icons-material/Computer';
import PublicIcon from '@mui/icons-material/Public';
import LanguageIcon from '@mui/icons-material/Language';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SettingsIcon from '@mui/icons-material/Settings';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import UploadIcon from '@mui/icons-material/Upload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import CompareIcon from '@mui/icons-material/Compare';
import VerifiedIcon from '@mui/icons-material/Verified';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { v4 as uuidv4 } from 'uuid';
import CodeIcon from '@mui/icons-material/Code';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import CookieIcon from '@mui/icons-material/Cookie';
import ScreenshotIcon from '@mui/icons-material/Screenshot';
import BugReportIcon from '@mui/icons-material/BugReport';
import DataObjectIcon from '@mui/icons-material/DataObject';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BlockIcon from '@mui/icons-material/Block';
import SavingsIcon from '@mui/icons-material/Savings';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import PasswordIcon from '@mui/icons-material/Password';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TranslateIcon from '@mui/icons-material/Translate';
import NoteIcon from '@mui/icons-material/Note';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import FolderIcon from '@mui/icons-material/Folder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GpsNotFixedIcon from '@mui/icons-material/GpsNotFixed';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';
import ExploreIcon from '@mui/icons-material/Explore';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import DownloadIcon from '@mui/icons-material/Download';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Pre-built extensions collection
const PREBUILT_EXTENSIONS = [
  // Privacy & Security Extensions
  {
    id: 'metamask',
    name: 'MetaMask',
    version: '10.28.1',
    description: 'Ethereum wallet for accessing blockchain applications',
    icon: 'wallet',
    imageUrl: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    category: 'crypto',
    enabled: false
  },
  {
    id: 'ublock',
    name: 'uBlock Origin',
    version: '1.44.4',
    description: 'Efficient ad blocker with low memory usage',
    icon: 'block',
    imageUrl: 'https://raw.githubusercontent.com/gorhill/uBlock/master/src/img/ublock.svg',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'lastpass',
    name: 'LastPass',
    version: '4.86.0',
    description: 'Password manager and secure vault',
    icon: 'password',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/LastPass_logo_2019.svg/512px-LastPass_logo_2019.svg.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'adblock',
    name: 'AdBlock',
    version: '5.3.3',
    description: 'Block ads and pop-ups on websites',
    icon: 'block',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/AdBlock_icon.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: '1password',
    name: '1Password',
    version: '2.9.1',
    description: 'Password manager with secure sharing',
    icon: 'password',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/1password-logo.svg/512px-1password-logo.svg.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'privacy-badger',
    name: 'Privacy Badger',
    version: '2023.6.13',
    description: 'Automatically blocks invisible trackers',
    icon: 'security',
    imageUrl: 'https://privacybadger.org/images/badger-logo-revamp.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'https-everywhere',
    name: 'HTTPS Everywhere',
    version: '2021.7.13',
    description: 'Encrypts your communications with many websites',
    icon: 'security',
    imageUrl: 'https://www.eff.org/files/https-everywhere-logo.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'noscript',
    name: 'NoScript',
    version: '11.4.19',
    description: 'Allows JavaScript only for trusted domains',
    icon: 'code',
    imageUrl: 'https://noscript.net/images/noscript-logo.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'cookie-autodelete',
    name: 'Cookie AutoDelete',
    version: '3.8.0',
    description: 'Automatically deletes cookies when tab closes',
    icon: 'cookie',
    imageUrl: 'https://addons.mozilla.org/user-media/addon_icons/710/710362-64.png',
    category: 'privacy',
    enabled: false
  },
  {
    id: 'decentraleyes',
    name: 'Decentraleyes',
    version: '2.0.17',
    description: 'Protects against tracking through CDNs',
    icon: 'visibility_off',
    imageUrl: 'https://decentraleyes.org/images/logo-font.svg',
    category: 'privacy',
    enabled: false
  },
  
  // E-commerce & Shopping Extensions
  {
    id: 'honey',
    name: 'Honey',
    version: '12.8.2',
    description: 'Automatically finds and applies coupon codes',
    icon: 'savings',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Honey_logo.svg/512px-Honey_logo.svg.png',
    category: 'shopping',
    enabled: false
  },
  {
    id: 'keepa',
    name: 'Keepa - Amazon Price Tracker',
    version: '3.89',
    description: 'Tracks price history on Amazon products',
    icon: 'shopping_cart',
    imageUrl: 'https://keepa.com/img/logo.png',
    category: 'shopping',
    enabled: false
  },
  {
    id: 'aliexpress-assistant',
    name: 'AliExpress Assistant',
    version: '7.5.1',
    description: 'Price comparison and coupon finder for AliExpress',
    icon: 'shopping_cart',
    imageUrl: 'https://ae01.alicdn.com/kf/HTB1JdXvbvvsK1Rjy0Fi762wtXXaS.png',
    category: 'shopping',
    enabled: false
  },
  {
    id: 'rakuten',
    name: 'Rakuten Cash Back',
    version: '5.14.0',
    description: 'Earn cash back when shopping online',
    icon: 'monetization_on',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Rakuten_Global_Brand_Logo.svg/512px-Rakuten_Global_Brand_Logo.svg.png',
    category: 'shopping',
    enabled: false
  },
  
  // Productivity Extensions
  {
    id: 'grammarly',
    name: 'Grammarly',
    version: '14.1.1',
    description: 'Grammar and spell checker for writing',
    icon: 'spellcheck',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Grammarly_logo.svg/512px-Grammarly_logo.svg.png',
    category: 'productivity',
    enabled: false
  },
  {
    id: 'darkreader',
    name: 'Dark Reader',
    version: '4.9.58',
    description: 'Dark mode for every website',
    icon: 'dark_mode',
    imageUrl: 'https://darkreader.org/images/darkreader-icon-256x256.png',
    category: 'productivity',
    enabled: false
  },
  {
    id: 'translate',
    name: 'Google Translate',
    version: '2.0.13',
    description: 'Translate text on websites',
    icon: 'translate',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Translate_logo.svg/512px-Google_Translate_logo.svg.png',
    category: 'productivity',
    enabled: false
  },
  {
    id: 'evernote',
    name: 'Evernote Web Clipper',
    version: '7.18.1',
    description: 'Save web pages to Evernote',
    icon: 'note',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Evernote_Icon.svg/512px-Evernote_Icon.svg.png',
    category: 'productivity',
    enabled: false
  },
  {
    id: 'notion',
    name: 'Notion Web Clipper',
    version: '0.2.0',
    description: 'Save web pages to Notion workspace',
    icon: 'note',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/512px-Notion-logo.svg.png',
    category: 'productivity',
    enabled: false
  },
  {
    id: 'pocket',
    name: 'Pocket',
    version: '3.0.7',
    description: 'Save articles to read later',
    icon: 'note',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Pocket_app_logo.svg/512px-Pocket_app_logo.svg.png',
    category: 'productivity',
    enabled: false
  },
  
  // Anti-Detection & Fingerprinting Extensions
  {
    id: 'canvas-blocker',
    name: 'Canvas Blocker',
    version: '1.7',
    description: 'Prevents canvas fingerprinting by websites',
    icon: 'fingerprint',
    imageUrl: 'https://addons.mozilla.org/user-media/addon_icons/523/523366-64.png',
    category: 'anti-detection',
    enabled: false
  },
  {
    id: 'user-agent-switcher',
    name: 'User-Agent Switcher',
    version: '3.0.5',
    description: 'Easily switch between different user-agents',
    icon: 'fingerprint',
    imageUrl: 'https://addons.mozilla.org/user-media/addon_icons/954/954390-64.png',
    category: 'anti-detection',
    enabled: false
  },
  {
    id: 'webrtc-control',
    name: 'WebRTC Control',
    version: '1.0.6',
    description: 'Prevent WebRTC leaks of your real IP address',
    icon: 'security',
    imageUrl: 'https://addons.mozilla.org/user-media/addon_icons/655/655064-64.png',
    category: 'anti-detection',
    enabled: false
  },
  {
    id: 'chameleon',
    name: 'Chameleon',
    version: '0.7.1',
    description: 'Spoof browser fingerprint and prevent tracking',
    icon: 'fingerprint',
    imageUrl: 'https://addons.mozilla.org/user-media/addon_icons/807/807635-64.png',
    category: 'anti-detection',
    enabled: false
  },
  
  // Developer Tools
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    version: '0.7.2',
    description: 'Makes JSON easy to read in the browser',
    icon: 'data_object',
    imageUrl: 'https://lh3.googleusercontent.com/fife/ALs6j_F9i_qWjLHUVxvs0wYHlRUmF5cvvVJK5kKwbAqEVPz-9QeOsM7yxkG9rfEL-VVQYAj0gk0-eAO3Yma7Yx8CrkOuQcFgTYj1LwipvOOZUcb9qMwgDLCYC0R_wQJEL_YSKzHyKLQxVlK_QQ',
    category: 'developer',
    enabled: false
  },
  {
    id: 'wappalyzer',
    name: 'Wappalyzer',
    version: '6.10.66',
    description: 'Identifies technologies used on websites',
    icon: 'code',
    imageUrl: 'https://www.wappalyzer.com/images/icons/wappalyzer-icon-light.svg',
    category: 'developer',
    enabled: false
  },
  {
    id: 'react-dev-tools',
    name: 'React Developer Tools',
    version: '4.28.0',
    description: 'Inspect React component hierarchies',
    icon: 'code',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png',
    category: 'developer',
    enabled: false
  },
  {
    id: 'colorzilla',
    name: 'ColorZilla',
    version: '2.4',
    description: 'Color picker, eyedropper, and gradient generator',
    icon: 'format_paint',
    imageUrl: 'https://www.colorzilla.com/chrome/images/colorzilla-icon-128.png',
    category: 'developer',
    enabled: false
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    version: '3.1.0',
    description: 'Website performance and optimization audits',
    icon: 'bug_report',
    imageUrl: 'https://developers.google.com/web/tools/lighthouse/images/lighthouse-logo.svg',
    category: 'developer',
    enabled: false
  },
  
  // Automation & Scraping
  {
    id: 'tampermonkey',
    name: 'Tampermonkey',
    version: '4.18.1',
    description: 'Run custom scripts on websites',
    icon: 'code',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Tampermonkey_Logo.svg/512px-Tampermonkey_Logo.svg.png',
    category: 'automation',
    enabled: false
  },
  {
    id: 'selenium-ide',
    name: 'Selenium IDE',
    version: '3.17.0',
    description: 'Record and playback browser interactions',
    icon: 'autofix_high',
    imageUrl: 'https://www.selenium.dev/images/selenium_logo_square_green.png',
    category: 'automation',
    enabled: false
  },
  {
    id: 'nimbus-screenshot',
    name: 'Nimbus Screenshot',
    version: '10.15.0',
    description: 'Capture screenshots and record screen',
    icon: 'screenshot',
    imageUrl: 'https://nimbusweb.me/img/nimbus-platform.png',
    category: 'automation',
    enabled: false
  },
  {
    id: 'autofill',
    name: 'Form Autofill',
    version: '2.5.0',
    description: 'Automatically fill forms with custom data',
    icon: 'autofix_high',
    imageUrl: 'https://lh3.googleusercontent.com/3NM94-L1RpZKVQZIVYrU-xjA_G9rvKLhXKGm-PJkOLKPvYMZGWLI5gcQgDlU9BVpyP2h9uM',
    category: 'automation',
    enabled: false
  },
  
  // Ticketmaster & Ticket Buying Extensions
  {
    id: 'ticketmaster-assistant',
    name: 'Ticketmaster Assistant',
    version: '2.5.0',
    description: 'Helps secure tickets faster on Ticketmaster with auto-refresh and quick checkout',
    icon: 'shopping_cart',
    imageUrl: 'https://www.ticketmaster.com/favicon.ico',
    category: 'ticketmaster',
    enabled: false
  },
  {
    id: 'auto-refresh-plus',
    name: 'Auto Refresh Plus',
    version: '3.2.1',
    description: 'Automatically refreshes pages at custom intervals to catch ticket releases',
    icon: 'refresh',
    imageUrl: 'https://lh3.googleusercontent.com/vvp6Ev33xPerWBBOtIRyAHl7k5c4wQ5d_9ge84OYvXo9vYJMxYx9p6L_HfGDBmFwAztn7sHVmevBfaI=w128-h128-e365-rj-sc0x00ffffff',
    category: 'ticketmaster',
    enabled: false
  },
  {
    id: 'ticket-buddy',
    name: 'Ticket Buddy',
    version: '1.8.3',
    description: 'Automatically fills in payment and personal information for faster checkout',
    icon: 'autofix_high',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1041/1041888.png',
    category: 'ticketmaster',
    enabled: false
  },
  {
    id: 'queue-it-helper',
    name: 'Queue-it Helper',
    version: '2.1.0',
    description: 'Helps manage and optimize virtual queue positions for high-demand ticket sales',
    icon: 'access_time',
    imageUrl: 'https://queue-it.com/media/1324/favicon.png',
    category: 'ticketmaster',
    enabled: false
  },
  {
    id: 'seat-finder',
    name: 'Seat Finder & Alerts',
    version: '3.0.2',
    description: 'Alerts when specific seats or sections become available on Ticketmaster',
    icon: 'notifications',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1458/1458512.png',
    category: 'ticketmaster',
    enabled: false
  },
  
  // StubHub & Resale Ticket Extensions
  {
    id: 'stubhub-price-tracker',
    name: 'StubHub Price Tracker',
    version: '2.3.0',
    description: 'Monitors price changes on StubHub listings and alerts when prices drop',
    icon: 'monetization_on',
    imageUrl: 'https://stubhub-marketing.s3.amazonaws.com/branding/icons/favicon.ico',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'seat-alerts',
    name: 'Seat Alerts Pro',
    version: '1.7.2',
    description: 'Get notified when specific seats or sections become available on StubHub',
    icon: 'notifications',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1040/1040993.png',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'ticket-compare',
    name: 'Ticket Price Compare',
    version: '3.1.0',
    description: 'Compares ticket prices across StubHub, SeatGeek, Vivid Seats and more',
    icon: 'compare',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1356/1356479.png',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'stubhub-checkout-helper',
    name: 'StubHub Checkout Helper',
    version: '2.0.1',
    description: 'Speeds up the checkout process on StubHub with auto-fill and quick purchase',
    icon: 'shopping_cart',
    imageUrl: 'https://www.stubhub.com/favicon.ico',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'ticket-authenticator',
    name: 'Ticket Authenticator',
    version: '1.4.5',
    description: 'Helps verify the authenticity of tickets on resale platforms like StubHub',
    icon: 'verified',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1271/1271380.png',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'best-seat-finder',
    name: 'Best Seat Finder',
    version: '2.2.3',
    description: 'Analyzes venue maps on StubHub to highlight the best value seats',
    icon: 'event_seat',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933772.png',
    category: 'stubhub',
    enabled: false
  },
  {
    id: 'ticket-drop-alert',
    name: 'Ticket Drop Alert',
    version: '1.9.0',
    description: 'Monitors StubHub for new ticket listings and price drops',
    icon: 'trending_down',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1067/1067357.png',
    category: 'stubhub',
    enabled: false
  },
];

// Extension categories with icons
const EXTENSION_CATEGORIES = [
  { id: 'all', label: 'All', icon: <ExtensionIcon /> },
  { id: 'privacy', label: 'Privacy & Security', icon: <SecurityIcon /> },
  { id: 'shopping', label: 'Shopping', icon: <ShoppingCartIcon /> },
  { id: 'productivity', label: 'Productivity', icon: <LanguageIcon /> },
  { id: 'crypto', label: 'Crypto & Finance', icon: <MonetizationOnIcon /> },
  { id: 'ticketmaster', label: 'Ticketmaster', icon: <EventIcon /> },
  { id: 'stubhub', label: 'StubHub', icon: <ConfirmationNumberIcon /> },
  { id: 'anti-detection', label: 'Anti-Detection', icon: <FingerprintIcon /> },
  { id: 'developer', label: 'Developer Tools', icon: <CodeIcon /> },
  { id: 'automation', label: 'Automation', icon: <AutoFixHighIcon /> }
];

// Helper function to get extension icon
const getExtensionIcon = (iconType) => {
  switch (iconType) {
    case 'wallet':
      return <WalletIcon />;
    case 'block':
      return <BlockIcon />;
    case 'savings':
      return <SavingsIcon />;
    case 'spellcheck':
      return <SpellcheckIcon />;
    case 'password':
      return <PasswordIcon />;
    case 'dark_mode':
      return <DarkModeIcon />;
    case 'translate':
      return <TranslateIcon />;
    case 'note':
      return <NoteIcon />;
    case 'shopping_cart':
      return <ShoppingCartIcon />;
    case 'security':
      return <SecurityIcon />;
    case 'code':
      return <CodeIcon />;
    case 'monetization_on':
      return <MonetizationOnIcon />;
    case 'autofix_high':
      return <AutoFixHighIcon />;
    case 'visibility_off':
      return <VisibilityOffIcon />;
    case 'format_paint':
      return <FormatPaintIcon />;
    case 'cookie':
      return <CookieIcon />;
    case 'screenshot':
      return <ScreenshotIcon />;
    case 'bug_report':
      return <BugReportIcon />;
    case 'data_object':
      return <DataObjectIcon />;
    case 'fingerprint':
      return <FingerprintIcon />;
    case 'refresh':
      return <RefreshIcon />;
    case 'access_time':
      return <AccessTimeIcon />;
    case 'notifications':
      return <NotificationsIcon />;
    case 'event':
      return <EventIcon />;
    case 'compare':
      return <CompareIcon />;
    case 'verified':
      return <VerifiedIcon />;
    case 'event_seat':
      return <EventSeatIcon />;
    case 'trending_down':
      return <TrendingDownIcon />;
    case 'confirmation_number':
      return <ConfirmationNumberIcon />;
    default:
      return <ExtensionIcon />;
  }
};

export default function ProfileCreationModal({ open, onClose, onCreateProfile, initialData }) {
  const [tabValue, setTabValue] = useState(0);
  const fileInputRef = useRef(null);
  const [isLoadingProxy, setIsLoadingProxy] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    os: 'Windows 10',
    startupUrl: '',
    notes: '',
    tags: '',
    browserType: 'chrome',
    browser: {
      version: 'latest',
      resolution: { width: 1920, height: 1080 },
      webrtcEnabled: false,
      canvasNoise: false,
      persistStorage: false,
      persistCookies: false,
      audioNoiseEnabled: false,
      audioNoiseLevel: 0.1,
      fontMaskingEnabled: false,
      hardwareSpecs: {
        cores: 4,
        memory: 8,
        gpu: 'Intel HD Graphics'
      }
    },
    proxy: {
      enabled: false,
      type: 'http',
      ip: '',
      port: '',
      username: '',
      password: '',
      auth: 'none',
      rotateUserAgent: false,
      autoRotate: false,
      rotationInterval: '1h',
      country: '',
      countryCode: '',
      city: '',
      isp: '',
      timeout: '',
      isAlive: false,
      timezone: '',
      lat: null,
      lon: null
    },
    webrtc: {
      mode: 'disabled',
      ipProtection: true,
      customIps: {
        localIp: '',
        publicIp: ''
      },
      mediaDevices: {
        audioInputs: 1,
        videoInputs: 1,
        audioOutputs: 1
      },
      peerConnectionEnabled: false,
      fillBasedOnIp: true
    },
    timezone: {
      useProxyTimezone: true,
      manualTimezone: 'America/New_York',
      gmtOffset: '-05:00',
      fillBasedOnIp: true,
      dontChangeTime: false,
      autoSync: true
    },
    geolocation: {
      mode: 'prompt',
      useIp: true,
      latitude: '40.7128',
      longitude: '-74.0060',
      accuracy: 100,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      country: 'United States',
      countryCode: 'US',
      state: 'New York',
      city: 'New York',
      zipCode: '10001',
      timeZone: 'America/New_York'
    },
    fingerprint: {
      canvas: 'noise',
      webgl: 'mask',
      audioContext: 'noise',
      mediaDevices: 'real',
      webglImage: 'noise',
      hardwareConcurrency: 'auto',
      deviceMemory: 'auto',
      fonts: 'real',
      resolution: '1920x1080',
      webglVendor: 'Google Inc.',
      webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)'
    },
    extensions: [],
    bookmarks: [
      {
        id: '1',
        name: 'Google',
        url: 'https://www.google.com',
        folder: '',
        icon: 'https://www.google.com/favicon.ico',
        addedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Amazon',
        url: 'https://www.amazon.com',
        folder: 'Shopping',
        icon: 'https://www.amazon.com/favicon.ico',
        addedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'GitHub',
        url: 'https://github.com',
        folder: 'Work',
        icon: 'https://github.com/favicon.ico',
        addedAt: new Date().toISOString()
      }
    ]
  });
  const [extensionCategory, setExtensionCategory] = useState('all');
  const [newBookmark, setNewBookmark] = useState({ name: '', url: '', folder: '' });
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [bookmarkFolders, setBookmarkFolders] = useState(['Work', 'Personal', 'Shopping', 'Social Media']);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Update the handleChange function to ensure it correctly updates nested objects
  const handleChange = (section, field, value) => {
    console.log(`Updating ${section}.${field} to:`, value);
    
    setProfileData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [field]: value
      }
    }));
  };

  const handleDirectChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Helper function to get GMT offset for a timezone
  const getGMTOffset = (timezone) => {
    try {
      const date = new Date();
      const options = { timeZone: timezone, timeZoneName: 'longOffset' };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      if (offsetPart) {
        // Convert format like "GMT-05:00" to "-05:00"
        return offsetPart.value.replace('GMT', '');
      }
      // Fallback to calculating offset manually
      const localTime = date.getTime();
      const localOffset = date.getTimezoneOffset() * 60000;
      const utc = localTime + localOffset;
      const targetTime = new Date(utc + (3600000 * getTimezoneHourOffset(timezone)));
      const offset = targetTime.getTimezoneOffset() / 60;
      const sign = offset > 0 ? '-' : '+';
      const hours = Math.abs(Math.floor(offset));
      const minutes = Math.abs(offset % 1) * 60;
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error getting GMT offset:', error);
      return '';
    }
  };

  // Helper function to get timezone hour offset
  const getTimezoneHourOffset = (timezone) => {
    const timezoneMap = {
      'America/New_York': -5,
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Los_Angeles': -8,
      'America/Anchorage': -9,
      'Pacific/Honolulu': -10,
      'Europe/London': 0,
      'Europe/Paris': 1,
      'Europe/Berlin': 1,
      'Europe/Moscow': 3,
      'Asia/Dubai': 4,
      'Asia/Kolkata': 5.5,
      'Asia/Shanghai': 8,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10
    };
    return timezoneMap[timezone] || 0;
  };

  // Handle proxy file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoadingProxy(true);

    try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n');
        
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          
            // Find column indexes
          const ipIndex = headers.indexOf('ip');
          const portIndex = headers.indexOf('port');
          const protocolIndex = headers.indexOf('protocol');
          const countryIndex = headers.indexOf('ip_data_country');
          const countryCodeIndex = headers.indexOf('ip_data_countryCode');
          const cityIndex = headers.indexOf('ip_data_city');
          const ispIndex = headers.indexOf('ip_data_isp');
          const timeoutIndex = headers.indexOf('timeout');
          const timezoneIndex = headers.indexOf('ip_data_timezone');
          const latIndex = headers.indexOf('ip_data_lat');
          const lonIndex = headers.indexOf('ip_data_lon');
          
            // Process first valid proxy
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
            
            const proxyData = lines[i].split(',');
            
            if (ipIndex !== -1 && portIndex !== -1) {
              const ip = proxyData[ipIndex];
              const port = proxyData[portIndex];
              
                if (ip && port) {
                  const protocol = protocolIndex !== -1 ? proxyData[protocolIndex] : 'http';
                  const country = countryIndex !== -1 ? proxyData[countryIndex] : 'Unknown';
                  const countryCode = countryCodeIndex !== -1 ? proxyData[countryCodeIndex].toLowerCase() : 'us';
                  const city = cityIndex !== -1 ? proxyData[cityIndex] : '';
                  const isp = ispIndex !== -1 ? proxyData[ispIndex] : 'Unknown';
                  const timeout = timeoutIndex !== -1 ? parseFloat(proxyData[timeoutIndex]).toFixed(0) : '1000';
                  const timezone = timezoneIndex !== -1 ? proxyData[timezoneIndex] : 'Unknown';
                  const lat = latIndex !== -1 ? proxyData[latIndex] : null;
                  const lon = lonIndex !== -1 ? proxyData[lonIndex] : null;
                  
                  let proxyType = 'http';
                  if (protocol.includes('socks4')) proxyType = 'socks4';
                  else if (protocol.includes('socks5')) proxyType = 'socks5';
                  else if (protocol.includes('ssh')) proxyType = 'ssh';
                  else if (protocol.includes('https')) proxyType = 'https';
                  
                  setProfileData(prev => ({
                    ...prev,
                    proxy: {
                      ...prev.proxy,
                      enabled: true,
                      type: proxyType,
                    ip,
                    port,
                    country,
                    countryCode,
                    city,
                    isp,
                    timeout,
                      isAlive: true,
                    timezone,
                    lat,
                    lon
                    }
                  }));
                  
                  break;
                }
              }
            }
        }
      } catch (error) {
        console.error('Error parsing proxy file:', error);
      }
    };
    
    reader.readAsText(file);
    } catch (error) {
      console.error('Error reading proxy file:', error);
    } finally {
      setIsLoadingProxy(false);
    event.target.value = '';
    }
  };

  // Generate random fingerprint
  const generateRandomFingerprint = () => {
    const osOptions = ['Windows 10', 'Windows 11', 'macOS', 'Linux'];
    const browserVersions = ['120', '119', '118'];
    const gpuVendors = [
      'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (NVIDIA GeForce RTX 3080)',
      'ANGLE (AMD Radeon RX 6800)'
    ];
    
    const randomOS = osOptions[Math.floor(Math.random() * osOptions.length)];
    const randomBrowserVersion = browserVersions[Math.floor(Math.random() * browserVersions.length)];
    const randomGPU = gpuVendors[Math.floor(Math.random() * gpuVendors.length)];
    
    setProfileData(prev => ({
      ...prev,
      os: randomOS,
      browser: {
        ...prev.browser,
        version: randomBrowserVersion,
        hardwareSpecs: {
          ...prev.browser.hardwareSpecs,
          gpu: randomGPU,
          cores: [2, 4, 8][Math.floor(Math.random() * 3)],
          memory: [4, 8, 16][Math.floor(Math.random() * 3)]
        }
      },
      fingerprint: {
        ...prev.fingerprint,
        canvas: Math.random() > 0.5 ? 'noise' : 'off',
        webgl: Math.random() > 0.5 ? 'mask' : 'off',
        audioContext: Math.random() > 0.5 ? 'noise' : 'off',
        webglImage: Math.random() > 0.5 ? 'noise' : 'off',
        webglVendor: randomGPU.split(' ')[1].replace('(', '').replace(',', ''),
        webglRenderer: randomGPU
      }
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!profileData.name.trim()) {
      alert('Profile name is required');
      return;
    }

    // Create the profile with a unique ID
    const newProfile = {
      ...profileData,
      id: Date.now(), // Simple ID generation
      createdAt: new Date().toISOString(),
      status: 'stopped'
    };

    onCreateProfile(newProfile);
  };

  // Update GMT offset when timezone changes
  const handleTimezoneChange = (timezone) => {
    const gmtOffset = getGMTOffset(timezone);
    setProfileData({
      ...profileData,
      timezone: {
        ...profileData.timezone,
        manualTimezone: timezone,
        gmtOffset: gmtOffset
      }
    });
  };

  // Toggle between proxy-based and manual timezone
  const handleUseProxyTimezone = (useProxy) => {
    setProfileData({
      ...profileData,
      timezone: {
        ...profileData.timezone,
        useProxyTimezone: useProxy
      }
    });
  };

  // Handle adding a pre-built extension
  const handleAddPrebuiltExtension = (extension) => {
    // Check if extension is already installed
    const isInstalled = profileData.extensions.some(ext => ext.id === extension.id);
    
    if (isInstalled) {
      // Extension already exists, you could show a notification here
      console.log(`Extension ${extension.name} is already installed`);
      return;
    }
    
    // Add the extension to the profile
    const newExtension = {
      ...extension,
      enabled: true,
      addedAt: new Date().toISOString()
    };
    
    setProfileData({
      ...profileData,
      extensions: [...profileData.extensions, newExtension]
    });
  };

  // Handle adding a sample extension (for testing)
  const handleAddExtension = () => {
    const newExtension = {
      id: uuidv4(),
      name: `Sample Extension ${profileData.extensions.length + 1}`,
      version: '1.0.0',
      enabled: true,
      description: 'This is a sample extension for testing purposes',
      icon: 'extension',
      imageUrl: 'https://www.google.com/chrome/static/images/chrome-logo.svg',
      addedAt: new Date().toISOString()
    };
    
    setProfileData({
      ...profileData,
      extensions: [...profileData.extensions, newExtension]
    });
  };

  // Handle toggling an extension on/off
  const handleToggleExtension = (extensionId) => {
    setProfileData({
      ...profileData,
      extensions: profileData.extensions.map(ext => 
        ext.id === extensionId ? { ...ext, enabled: !ext.enabled } : ext
      )
    });
  };

  // Handle removing an extension
  const handleRemoveExtension = (extensionId) => {
    setProfileData({
      ...profileData,
      extensions: profileData.extensions.filter(ext => ext.id !== extensionId)
    });
  };

  // Handle file upload for CRX extensions
  const handleExtensionFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // In a real implementation, you would process the CRX file here
    // For now, we'll simulate adding an extension based on the filename
    
    const fileName = file.name.replace('.crx', '');
    const newExtension = {
      id: uuidv4(),
      name: fileName.charAt(0).toUpperCase() + fileName.slice(1),
      version: '1.0.0',
      enabled: true,
      description: `Uploaded extension: ${fileName}`,
      icon: 'extension',
      imageUrl: 'https://www.google.com/chrome/static/images/chrome-logo.svg',
      addedAt: new Date().toISOString()
    };
    
    setProfileData({
      ...profileData,
      extensions: [...profileData.extensions, newExtension]
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter extensions by category
  const getFilteredExtensions = () => {
    if (extensionCategory === 'all') {
      return PREBUILT_EXTENSIONS;
    }
    return PREBUILT_EXTENSIONS.filter(ext => ext.category === extensionCategory);
  };

  // Render the Extensions tab content
  const renderExtensionsTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="h6" gutterBottom>
          Extensions Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddExtension}
          >
            Add Sample Extension
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CRX File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".crx"
            onChange={handleExtensionFileUpload}
          />
        </Box>
        
        {/* Installed Extensions Section */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>
          Installed Extensions ({profileData.extensions.length})
        </Typography>
        
        {profileData.extensions.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No extensions installed. Add extensions from the list below or upload your own CRX files.
          </Alert>
        ) : (
          <List sx={{ mb: 3 }}>
            {profileData.extensions.map((extension) => (
              <ListItem key={extension.id} divider>
                <ListItemAvatar>
                  <Avatar src={extension.imageUrl}>
                    {!extension.imageUrl && getExtensionIcon(extension.icon)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={extension.name}
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" component="span" color="text.secondary">
                        v{extension.version}
                      </Typography>
                      <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
                        {extension.description}
                      </Typography>
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={extension.enabled}
                        onChange={() => handleToggleExtension(extension.id)}
                        size="small"
                      />
                    }
                    label="Enabled"
                  />
                  <IconButton 
                    edge="end" 
                    onClick={() => handleRemoveExtension(extension.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
        
        {/* Available Extensions Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Available Extensions
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip 
              label="All" 
              onClick={() => setExtensionCategory('all')}
              color={extensionCategory === 'all' ? 'primary' : 'default'}
              variant={extensionCategory === 'all' ? 'filled' : 'outlined'}
            />
            {EXTENSION_CATEGORIES.map((category) => (
              <Chip 
                key={category.id}
                label={category.label}
                icon={React.cloneElement(category.icon, { style: { fontSize: 16 } })}
                onClick={() => setExtensionCategory(category.id)}
                color={extensionCategory === category.id ? 'primary' : 'default'}
                variant={extensionCategory === category.id ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          
          <Grid container spacing={2}>
            {getFilteredExtensions().map((extension) => {
              const isInstalled = profileData.extensions.some(ext => ext.id === extension.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={extension.id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {isInstalled && (
                      <Chip
                        label="Installed"
                        color="success"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1
                        }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, mr: 1 }} src={extension.imageUrl}>
                          {!extension.imageUrl && getExtensionIcon(extension.icon)}
                        </Avatar>
                        <Typography variant="subtitle2" noWrap>
                          {extension.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        v{extension.version}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem', height: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {extension.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        fullWidth
                        variant={isInstalled ? "outlined" : "contained"}
                        onClick={() => handleAddPrebuiltExtension(extension)}
                        disabled={isInstalled}
                      >
                        {isInstalled ? 'Installed' : 'Add'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>About Extensions</AlertTitle>
          Extensions are profile-specific and won't be shared between profiles. Be cautious when installing extensions as they can access page content and may pose privacy risks.
        </Alert>
      </Box>
    );
  };

  // Handle adding a new bookmark
  const handleAddBookmark = () => {
    if (!newBookmark.name.trim() || !newBookmark.url.trim()) {
      return;
    }

    // Validate URL format
    let url = newBookmark.url;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    if (editingBookmarkId) {
      // Update existing bookmark
      setProfileData(prev => ({
        ...prev,
        bookmarks: prev.bookmarks.map(bookmark => 
          bookmark.id === editingBookmarkId 
            ? { 
                ...bookmark, 
                name: newBookmark.name, 
                url, 
                folder: newBookmark.folder,
                icon: `https://www.google.com/s2/favicons?domain=${url}&sz=64`
              }
            : bookmark
        )
      }));
      setEditingBookmarkId(null);
    } else {
      // Add new bookmark
      const newBookmarkWithId = {
        id: uuidv4(),
        name: newBookmark.name,
        url,
        folder: newBookmark.folder,
        icon: `https://www.google.com/s2/favicons?domain=${url}&sz=64`,
        addedAt: new Date().toISOString()
      };
      
      setProfileData(prev => ({
        ...prev,
        bookmarks: [...prev.bookmarks, newBookmarkWithId]
      }));
    }
    
    // Reset form
    setNewBookmark({ name: '', url: '', folder: '' });
  };

  // Handle editing a bookmark
  const handleEditBookmark = (bookmark) => {
    setNewBookmark({
      name: bookmark.name,
      url: bookmark.url,
      folder: bookmark.folder || ''
    });
    setEditingBookmarkId(bookmark.id);
  };

  // Handle removing a bookmark
  const handleRemoveBookmark = (bookmarkId) => {
    setProfileData(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.filter(bookmark => bookmark.id !== bookmarkId)
    }));
    
    if (editingBookmarkId === bookmarkId) {
      setNewBookmark({ name: '', url: '', folder: '' });
      setEditingBookmarkId(null);
    }
  };

  // Handle adding a new folder
  const handleAddFolder = () => {
    if (newFolderName.trim() && !bookmarkFolders.includes(newFolderName.trim())) {
      setBookmarkFolders([...bookmarkFolders, newFolderName.trim()]);
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  // Get bookmarks grouped by folder
  const getBookmarksByFolder = () => {
    const result = {};
    
    // Initialize with empty arrays for all folders
    bookmarkFolders.forEach(folder => {
      result[folder] = [];
    });
    
    // Add "Unfiled Bookmarks" category
    result['Unfiled Bookmarks'] = [];
    
    // Group bookmarks by folder
    profileData.bookmarks.forEach(bookmark => {
      if (bookmark.folder && result[bookmark.folder]) {
        result[bookmark.folder].push(bookmark);
      } else {
        result['Unfiled Bookmarks'].push(bookmark);
      }
    });
    
    return result;
  };

  // Render the Bookmarks tab content
  const renderBookmarksTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BookmarkIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Bookmarks Management</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Profile-Specific Bookmarks</AlertTitle>
          Bookmarks are isolated to this profile and won't appear in other profiles. This helps maintain separate browsing identities and prevents cross-profile tracking.
        </Alert>

        {/* Add New Bookmark Section */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            {editingBookmarkId ? 'Edit Bookmark' : 'Add New Bookmark'}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Title"
                value={newBookmark.name}
                onChange={(e) => setNewBookmark({...newBookmark, name: e.target.value})}
                size="small"
                placeholder="Enter bookmark title"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BookmarkIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="URL"
                value={newBookmark.url}
                onChange={(e) => setNewBookmark({...newBookmark, url: e.target.value})}
                size="small"
                placeholder="https://example.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Folder</InputLabel>
                  <Select
                    value={newBookmark.folder}
                    onChange={(e) => setNewBookmark({...newBookmark, folder: e.target.value})}
                    label="Folder"
                    startAdornment={
                      <InputAdornment position="start">
                        <FolderIcon fontSize="small" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {bookmarkFolders.map((folder) => (
                      <MenuItem key={folder} value={folder}>{folder}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Tooltip title="Create New Folder">
                  <IconButton 
                    onClick={() => setShowNewFolderInput(true)}
                    size="small"
                    sx={{ mt: 0.5 }}
                  >
                    <CreateNewFolderIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {showNewFolderInput && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="New Folder Name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={handleAddFolder}
                    disabled={!newFolderName.trim()}
                  >
                    Add
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            {editingBookmarkId && (
              <Button 
                variant="outlined" 
                onClick={() => {
                  setNewBookmark({ name: '', url: '', folder: '' });
                  setEditingBookmarkId(null);
                }}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
            )}
            <Button 
              variant="contained" 
              onClick={handleAddBookmark}
              disabled={!newBookmark.name.trim() || !newBookmark.url.trim()}
            >
              {editingBookmarkId ? 'Update Bookmark' : 'Add Bookmark'}
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>
          Your Bookmarks ({profileData.bookmarks.length})
        </Typography>
        
        {profileData.bookmarks.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No bookmarks added yet. Add your first bookmark using the form above.
          </Alert>
        ) : (
                  <List sx={{ 
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: 1
          }}>
            {profileData.bookmarks.map((bookmark, index) => (
              <React.Fragment key={bookmark.id}>
                {index > 0 && <Divider />}
                <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <DragIndicatorIcon sx={{ color: 'text.disabled' }} />
                        </ListItemIcon>
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}
                            src={`https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=64`}
                          >
                            <BookmarkIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={bookmark.name}
                          secondary={bookmark.url}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Edit">
                            <IconButton 
                              edge="end" 
                              onClick={() => handleEditBookmark(bookmark)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove">
                            <IconButton 
                              edge="end" 
                              onClick={() => handleRemoveBookmark(bookmark.id)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
              </React.Fragment>
                    ))}
                  </List>
        )}

        {/* Import/Export Section */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Import/Export Bookmarks
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => {
                  alert('Import bookmarks functionality would go here');
                }}
              >
                Import Bookmarks
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const bookmarksJson = JSON.stringify(profileData.bookmarks || [], null, 2);
                  const blob = new Blob([bookmarksJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `bookmarks_${profileData.name || 'new_profile'}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                disabled={!profileData.bookmarks?.length}
              >
                Export Bookmarks
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Render WebRTC tab content
  const renderWebRTCTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NetworkCheckIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">WebRTC Settings</Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>What is WebRTC?</AlertTitle>
          WebRTC (Web Real-Time Communication) is a technology that enables web applications to have real-time communication capabilities like video chat and peer-to-peer file sharing. However, it can leak your real IP address even when using a proxy or VPN. These settings help protect your privacy.
        </Alert>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            WebRTC Mode
          </Typography>
          
          <RadioGroup
            value={profileData.webrtc.mode}
            onChange={(e) => handleChange('webrtc', 'mode', e.target.value)}
          >
            <FormControlLabel 
              value="disabled" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StopScreenShareIcon sx={{ mr: 1, color: 'error.main' }} />
                  <Box>
                    <Typography variant="body2">Disabled (Recommended)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Completely disables WebRTC functionality. Most secure option but may break some websites.
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel 
              value="real" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VisibilityIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="body2">Real (Use actual IP)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uses your real IP address for WebRTC connections. Not recommended if you're trying to hide your identity.
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel 
              value="proxy" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VisibilityOffIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="body2">Proxy (Use proxy IP)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uses your proxy IP address for WebRTC connections. Good balance between functionality and privacy.
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel 
              value="custom" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2">Custom (Specify IPs)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Manually specify the local and public IPs to use for WebRTC connections.
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
          
          {profileData.webrtc.mode === 'custom' && (
            <Box sx={{ mt: 2, pl: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Local IP Address"
                    value={profileData.webrtc.customIps.localIp}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        customIps: {
                          ...profileData.webrtc.customIps,
                          localIp: e.target.value
                        }
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                    placeholder="192.168.1.1"
                    size="small"
                    helperText="Your local network IP address"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Public IP Address"
                    value={profileData.webrtc.customIps.publicIp}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        customIps: {
                          ...profileData.webrtc.customIps,
                          publicIp: e.target.value
                        }
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                    placeholder="203.0.113.1"
                    size="small"
                    helperText="The public IP you want websites to see"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Media Devices
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure the number of virtual media devices that will be available to websites through WebRTC.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  mb: 1
                }}>
                  <MicIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="subtitle2" gutterBottom>Audio Inputs</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={profileData.webrtc.mediaDevices.audioInputs}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        mediaDevices: {
                          ...profileData.webrtc.mediaDevices,
                          audioInputs: e.target.value
                        }
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                  >
                    <MenuItem value={0}>None</MenuItem>
                    <MenuItem value={1}>1 Microphone</MenuItem>
                    <MenuItem value={2}>2 Microphones</MenuItem>
                    <MenuItem value={3}>3 Microphones</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'error.light',
                  mb: 1
                }}>
                  <VideocamIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="subtitle2" gutterBottom>Video Inputs</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={profileData.webrtc.mediaDevices.videoInputs}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        mediaDevices: {
                          ...profileData.webrtc.mediaDevices,
                          videoInputs: e.target.value
                        }
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                  >
                    <MenuItem value={0}>None</MenuItem>
                    <MenuItem value={1}>1 Camera</MenuItem>
                    <MenuItem value={2}>2 Cameras</MenuItem>
                    <MenuItem value={3}>3 Cameras</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'success.light',
                  mb: 1
                }}>
                  <VolumeUpIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="subtitle2" gutterBottom>Audio Outputs</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={profileData.webrtc.mediaDevices.audioOutputs}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        mediaDevices: {
                          ...profileData.webrtc.mediaDevices,
                          audioOutputs: e.target.value
                        }
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                  >
                    <MenuItem value={0}>None</MenuItem>
                    <MenuItem value={1}>1 Speaker</MenuItem>
                    <MenuItem value={2}>2 Speakers</MenuItem>
                    <MenuItem value={3}>3 Speakers</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Additional Settings
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.webrtc.ipProtection}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        ipProtection: e.target.checked
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">IP Protection</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Prevents WebRTC from leaking your real IP address even when WebRTC is enabled
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.webrtc.peerConnectionEnabled}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        peerConnectionEnabled: e.target.checked
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Enable Peer Connection</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Allows peer-to-peer connections for video calls and file sharing (may expose more fingerprinting surface)
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.webrtc.fillBasedOnIp}
                    onChange={(e) => {
                      const newWebRTC = {
                        ...profileData.webrtc,
                        fillBasedOnIp: e.target.checked
                      };
                      handleChange('webrtc', '', newWebRTC);
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Auto-fill IPs based on proxy</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automatically uses your proxy IP information for WebRTC when in proxy mode
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Handle updating geolocation coordinates
  const handleUpdateCoordinates = (lat, lng) => {
    // In a real app, this would fetch location data based on coordinates
    // For now, we'll simulate it with some basic logic
    
    let country = 'United States';
    let countryCode = 'US';
    let state = 'New York';
    let city = 'New York';
    let zipCode = '10001';
    let timeZone = 'America/New_York';
    
    // Very basic location determination based on coordinates
    if (lat > 49 && lng < -120) {
      country = 'Canada';
      countryCode = 'CA';
      state = 'British Columbia';
      city = 'Vancouver';
      zipCode = 'V5K 0A1';
      timeZone = 'America/Vancouver';
    } else if (lat > 48 && lng > 2 && lng < 3) {
      country = 'France';
      countryCode = 'FR';
      state = 'Île-de-France';
      city = 'Paris';
      zipCode = '75001';
      timeZone = 'Europe/Paris';
    } else if (lat > 51 && lng > -1 && lng < 0) {
      country = 'United Kingdom';
      countryCode = 'GB';
      state = 'England';
      city = 'London';
      zipCode = 'SW1A 1AA';
      timeZone = 'Europe/London';
    } else if (lat > 35 && lat < 36 && lng > 139 && lng < 140) {
      country = 'Japan';
      countryCode = 'JP';
      state = 'Tokyo';
      city = 'Tokyo';
      zipCode = '100-0001';
      timeZone = 'Asia/Tokyo';
    }
    
    setProfileData({
      ...profileData,
      geolocation: {
        ...profileData.geolocation,
        latitude: lat.toString(),
        longitude: lng.toString(),
        country,
        countryCode,
        state,
        city,
        zipCode,
        timeZone
      },
      // Also update timezone if it's set to use geolocation
      timezone: {
        ...profileData.timezone,
        manualTimezone: timeZone,
        gmtOffset: getGMTOffset(timeZone)
      }
    });
  };

  // Simulate fetching location data from IP
  const fetchLocationFromIp = () => {
    // In a real app, this would make an API call to get location data from the proxy IP
    // For now, we'll simulate it with some dummy data based on the proxy settings
    
    if (profileData.proxy.enabled && profileData.proxy.ip) {
      // Extract country from proxy if available
      const country = profileData.proxy.country || 'United States';
      const countryCode = profileData.proxy.countryCode || 'US';
      const city = profileData.proxy.city || 'New York';
      const timeZone = profileData.proxy.timezone || 'America/New_York';
      
      // Use proxy coordinates if available, otherwise use defaults for the country
      let latitude = profileData.proxy.lat || '40.7128';
      let longitude = profileData.proxy.lon || '-74.0060';
      
      setProfileData({
        ...profileData,
        geolocation: {
          ...profileData.geolocation,
          latitude,
          longitude,
          country,
          countryCode,
          city,
          timeZone,
          // Other fields would be set here in a real implementation
          state: 'Unknown',
          zipCode: 'Unknown'
        }
      });
    } else {
      // If no proxy is set, use default US location
      setProfileData({
        ...profileData,
        geolocation: {
          ...profileData.geolocation,
          latitude: '40.7128',
          longitude: '-74.0060',
          country: 'United States',
          countryCode: 'US',
          state: 'New York',
          city: 'New York',
          zipCode: '10001',
          timeZone: 'America/New_York'
        }
      });
    }
  };

  // Render the Geolocation tab content
  const renderGeolocationTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Geolocation Settings</Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Why is geolocation important?</AlertTitle>
          Websites can request your location through the browser's Geolocation API. If your reported location doesn't match your IP address location, it can be a red flag for detection systems. These settings help ensure consistency between your IP and geolocation data.
        </Alert>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Geolocation Mode
          </Typography>
          
          <RadioGroup
            value={profileData.geolocation.mode}
            onChange={(e) => handleChange('geolocation', 'mode', e.target.value)}
          >
            <FormControlLabel 
              value="prompt" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GpsNotFixedIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2">Prompt (Recommended)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Browser will ask for permission before sharing your location with websites.
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel 
              value="allow" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GpsFixedIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="body2">Allow</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automatically allow websites to access your location without prompting.
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel 
              value="block" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOffIcon sx={{ mr: 1, color: 'error.main' }} />
                  <Box>
                    <Typography variant="body2">Block</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Never allow websites to access your location. May break some location-based services.
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </Paper>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Location Source
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={profileData.geolocation.useIp}
                  onChange={(e) => handleChange('geolocation', 'useIp', e.target.checked)}
                  color="primary"
                />
              }
              label="Use location from IP"
              sx={{ m: 0 }}
            />
          </Box>
          
          {profileData.geolocation.useIp ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>IP-based location enabled</AlertTitle>
                Your browser location will be automatically determined based on your IP address. This ensures consistency between your IP and reported location.
              </Alert>
              
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchLocationFromIp}
                sx={{ mb: 2 }}
              >
                Refresh Location from IP
              </Button>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Current Location
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationCityIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2">
                        {profileData.geolocation.city}, {profileData.geolocation.state}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PublicIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2">
                        {profileData.geolocation.country} ({profileData.geolocation.countryCode})
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MyLocationIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2">
                        {profileData.geolocation.latitude}, {profileData.geolocation.longitude}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <MapIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" align="center">
                      Location is determined by your IP address.
                      {profileData.proxy.enabled ? 
                        ' Using proxy location data.' : 
                        ' Using your real IP location.'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manually set your location coordinates. This will be used when websites request your location.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    value={profileData.geolocation.latitude}
                    onChange={(e) => handleChange('geolocation', 'latitude', e.target.value)}
                    placeholder="40.7128"
                    helperText="Enter a value between -90 and 90"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ExploreIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    value={profileData.geolocation.longitude}
                    onChange={(e) => handleChange('geolocation', 'longitude', e.target.value)}
                    placeholder="-74.0060"
                    helperText="Enter a value between -180 and 180"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ExploreIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleUpdateCoordinates(
                      parseFloat(profileData.geolocation.latitude), 
                      parseFloat(profileData.geolocation.longitude)
                    )}
                    disabled={!profileData.geolocation.latitude || !profileData.geolocation.longitude}
                  >
                    Update Location Data
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Location Details
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={profileData.geolocation.country}
                        onChange={(e) => handleChange('geolocation', 'country', e.target.value)}
                        size="small"
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Country Code"
                        value={profileData.geolocation.countryCode}
                        onChange={(e) => handleChange('geolocation', 'countryCode', e.target.value)}
                        size="small"
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="State/Region"
                        value={profileData.geolocation.state}
                        onChange={(e) => handleChange('geolocation', 'state', e.target.value)}
                        size="small"
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={profileData.geolocation.city}
                        onChange={(e) => handleChange('geolocation', 'city', e.target.value)}
                        size="small"
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Zip/Postal Code"
                        value={profileData.geolocation.zipCode}
                        onChange={(e) => handleChange('geolocation', 'zipCode', e.target.value)}
                        size="small"
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small" margin="normal">
                        <InputLabel>Time Zone</InputLabel>
                        <Select
                          value={profileData.geolocation.timeZone}
                          onChange={(e) => handleChange('geolocation', 'timeZone', e.target.value)}
                          label="Time Zone"
                        >
                          <MenuItem value="America/New_York">America/New_York</MenuItem>
                          <MenuItem value="America/Chicago">America/Chicago</MenuItem>
                          <MenuItem value="America/Denver">America/Denver</MenuItem>
                          <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                          <MenuItem value="Europe/London">Europe/London</MenuItem>
                          <MenuItem value="Europe/Paris">Europe/Paris</MenuItem>
                          <MenuItem value="Europe/Berlin">Europe/Berlin</MenuItem>
                          <MenuItem value="Asia/Tokyo">Asia/Tokyo</MenuItem>
                          <MenuItem value="Asia/Shanghai">Asia/Shanghai</MenuItem>
                          <MenuItem value="Australia/Sydney">Australia/Sydney</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
        
        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Advanced Geolocation Settings
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure additional geolocation parameters for more precise location spoofing.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Accuracy (meters)
              </Typography>
              <Slider
                value={profileData.geolocation.accuracy}
                onChange={(e, newValue) => handleChange('geolocation', 'accuracy', newValue)}
                min={1}
                max={1000}
                step={1}
                valueLabelDisplay="auto"
                marks={[
                  { value: 1, label: '1m' },
                  { value: 100, label: '100m' },
                  { value: 500, label: '500m' },
                  { value: 1000, label: '1km' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Lower values indicate higher precision. Most mobile devices report 5-50m accuracy, while desktop browsers typically report 50-500m.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Altitude (meters)"
                value={profileData.geolocation.altitude || ''}
                onChange={(e) => handleChange('geolocation', 'altitude', e.target.value ? Number(e.target.value) : null)}
                type="number"
                placeholder="Optional"
                helperText="Height above sea level in meters (optional)"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Altitude Accuracy (meters)"
                value={profileData.geolocation.altitudeAccuracy || ''}
                onChange={(e) => handleChange('geolocation', 'altitudeAccuracy', e.target.value ? Number(e.target.value) : null)}
                type="number"
                placeholder="Optional"
                helperText="Accuracy of altitude in meters (optional)"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Heading (degrees)"
                value={profileData.geolocation.heading || ''}
                onChange={(e) => handleChange('geolocation', 'heading', e.target.value ? Number(e.target.value) : null)}
                type="number"
                placeholder="Optional"
                helperText="Direction of travel in degrees (0-360, optional)"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Speed (m/s)"
                value={profileData.geolocation.speed || ''}
                onChange={(e) => handleChange('geolocation', 'speed', e.target.value ? Number(e.target.value) : null)}
                type="number"
                placeholder="Optional"
                helperText="Speed in meters per second (optional)"
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Update the useEffect hook to ensure proxy data is properly handled
  useEffect(() => {
    if (initialData) {
      console.log('Initializing form with profile data:', initialData);
      
      // Create a normalized version of the profile data
      const normalizedData = {
        ...initialData,
        // Ensure proxy has all required fields
        proxy: {
          enabled: false,
          type: 'http',
          host: '',
          ip: '',
          port: '',
          username: '',
          password: '',
          ...initialData.proxy
        }
      };
      
      setProfileData(normalizedData);
    }
  }, [initialData]);

  // Render Fingerprint tab
  const renderFingerprintTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FingerprintIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Browser Fingerprint Settings</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>About Browser Fingerprinting</AlertTitle>
          Browser fingerprinting is a technique used to identify and track users based on their browser's characteristics. These settings help you control and customize your browser's fingerprint to prevent tracking.
        </Alert>

        {/* Quick Actions */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Quick Actions</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={generateRandomFingerprint}
            >
              Generate Random Fingerprint
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Browser Version</InputLabel>
                <Select
                  value={profileData.fingerprint?.browserVersion || 'latest'}
                  onChange={(e) => handleNestedChange('fingerprint', 'browserVersion', e.target.value)}
                  label="Browser Version"
                >
                  <MenuItem value="latest">Latest (120)</MenuItem>
                  <MenuItem value="119">Chrome 119</MenuItem>
                  <MenuItem value="118">Chrome 118</MenuItem>
                  <MenuItem value="117">Chrome 117</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Screen Resolution</InputLabel>
                <Select
                  value={profileData.fingerprint?.resolution || '1920x1080'}
                  onChange={(e) => handleNestedChange('fingerprint', 'resolution', e.target.value)}
                  label="Screen Resolution"
                >
                  <MenuItem value="1920x1080">1920x1080 (FHD)</MenuItem>
                  <MenuItem value="2560x1440">2560x1440 (2K)</MenuItem>
                  <MenuItem value="3840x2160">3840x2160 (4K)</MenuItem>
                  <MenuItem value="1366x768">1366x768 (HD)</MenuItem>
                  <MenuItem value="1440x900">1440x900</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Canvas Fingerprinting */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Canvas Fingerprinting
          </Typography>
          
          <FormControl component="fieldset">
            <RadioGroup
              value={profileData.fingerprint?.canvas || 'noise'}
              onChange={(e) => handleNestedChange('fingerprint', 'canvas', e.target.value)}
            >
              <FormControlLabel
                value="noise"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Add Noise</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adds random noise to canvas operations to prevent fingerprinting
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="block"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Block</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Completely blocks canvas access (may break some websites)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="off"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Off</Typography>
                    <Typography variant="caption" color="text.secondary">
                      No protection (not recommended)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* WebGL Settings */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            WebGL Settings
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={profileData.fingerprint?.webgl || 'noise'}
                  onChange={(e) => handleNestedChange('fingerprint', 'webgl', e.target.value)}
                >
                  <FormControlLabel
                    value="noise"
                    control={<Radio />}
                    label="Add noise to WebGL fingerprint"
                  />
                  <FormControlLabel
                    value="block"
                    control={<Radio />}
                    label="Block WebGL (may break 3D content)"
                  />
                  <FormControlLabel
                    value="off"
                    control={<Radio />}
                    label="No protection"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WebGL Vendor"
                value={profileData.fingerprint?.webglVendor || ''}
                onChange={(e) => handleNestedChange('fingerprint', 'webglVendor', e.target.value)}
                size="small"
                helperText="Example: Google Inc."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WebGL Renderer"
                value={profileData.fingerprint?.webglRenderer || ''}
                onChange={(e) => handleNestedChange('fingerprint', 'webglRenderer', e.target.value)}
                size="small"
                helperText="Example: ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Hardware Parameters */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Hardware Parameters
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Device Memory</InputLabel>
                <Select
                  value={profileData.fingerprint?.deviceMemory || '8'}
                  onChange={(e) => handleNestedChange('fingerprint', 'deviceMemory', e.target.value)}
                  label="Device Memory"
                >
                  <MenuItem value="4">4 GB</MenuItem>
                  <MenuItem value="8">8 GB</MenuItem>
                  <MenuItem value="16">16 GB</MenuItem>
                  <MenuItem value="32">32 GB</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Hardware Concurrency</InputLabel>
                <Select
                  value={profileData.fingerprint?.hardwareConcurrency || '4'}
                  onChange={(e) => handleNestedChange('fingerprint', 'hardwareConcurrency', e.target.value)}
                  label="Hardware Concurrency"
                >
                  <MenuItem value="2">2 Cores</MenuItem>
                  <MenuItem value="4">4 Cores</MenuItem>
                  <MenuItem value="8">8 Cores</MenuItem>
                  <MenuItem value="16">16 Cores</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Audio Context */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Audio Context
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={profileData.fingerprint?.audioContext || 'noise'}
              onChange={(e) => handleNestedChange('fingerprint', 'audioContext', e.target.value)}
            >
              <FormControlLabel
                value="noise"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Add Noise</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adds random noise to audio processing to prevent fingerprinting
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="block"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Block</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Blocks audio context access (may affect audio playback)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="off"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Off</Typography>
                    <Typography variant="caption" color="text.secondary">
                      No protection
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* Additional Settings */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Additional Settings
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.fingerprint?.webglVendorOverride || false}
                    onChange={(e) => handleNestedChange('fingerprint', 'webglVendorOverride', e.target.checked)}
                  />
                }
                label="Override WebGL vendor and renderer strings"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.fingerprint?.mediaDevicesOverride || false}
                    onChange={(e) => handleNestedChange('fingerprint', 'mediaDevicesOverride', e.target.checked)}
                  />
                }
                label="Override media devices enumeration"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.fingerprint?.hardwareAcceleration || true}
                    onChange={(e) => handleNestedChange('fingerprint', 'hardwareAcceleration', e.target.checked)}
                  />
                }
                label="Enable hardware acceleration"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Render Advanced tab
  const renderAdvancedTab = () => {
    return (
      <Box sx={{ p: 1 }}>
        {/* Navigator Section */}
        <Typography variant="subtitle1" gutterBottom>
          Navigator
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="User Agent"
              value={profileData.advanced?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit...'}
              onChange={(e) => handleNestedChange('advanced', 'userAgent', e.target.value)}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Screen Resolution"
              value={profileData.advanced?.screenResolution || '1920x1080'}
              onChange={(e) => handleNestedChange('advanced', 'screenResolution', e.target.value)}
              size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">Languages</Typography>
              <Switch
                checked={profileData.advanced?.spoofLanguages || false}
                onChange={(e) => handleNestedChange('advanced', 'spoofLanguages', e.target.checked)}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Platform"
              value={profileData.advanced?.platform || 'Win32'}
              onChange={(e) => handleNestedChange('advanced', 'platform', e.target.value)}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="CPU Threads"
              value={profileData.advanced?.cpuThreads || '4'}
              onChange={(e) => handleNestedChange('advanced', 'cpuThreads', e.target.value)}
              size="small"
              type="number"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="RAM"
              value={profileData.advanced?.ram || '8'}
              onChange={(e) => handleNestedChange('advanced', 'ram', e.target.value)}
              size="small"
              type="number"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">ColorDepth</Typography>
              <Switch
                checked={profileData.advanced?.colorDepth || false}
                onChange={(e) => handleNestedChange('advanced', 'colorDepth', e.target.checked)}
                size="small"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Fonts Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Fonts
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={profileData.advanced?.enableFontsMasking || false}
                onChange={(e) => handleNestedChange('advanced', 'enableFontsMasking', e.target.checked)}
                size="small"
              />
            }
            label="Enable fonts list masking"
          />

          <Paper variant="outlined" sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
            <List dense>
              {['AIGDT', 'AMGDT', 'Arial', 'Arial ANSI', 'Arial Black', 'Arial CE', 'Arial Cyr', 'Arial Greek'].map((font) => (
                <ListItem key={font}>
                  <ListItemText primary={font} />
                </ListItem>
              ))}
            </List>
          </Paper>
          
          <Button
            variant="contained"
            size="small"
            sx={{ mt: 1 }}
          >
            Edit
          </Button>
        </Box>

        {/* Mask Media Devices Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Mask Media Devices
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={profileData.advanced?.maskMediaDevices || false}
                onChange={(e) => handleNestedChange('advanced', 'maskMediaDevices', e.target.checked)}
                size="small"
              />
            }
            label="Mask Media Devices"
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Video Inputs"
                type="number"
                value={profileData.advanced?.videoInputs || '0'}
                onChange={(e) => handleNestedChange('advanced', 'videoInputs', e.target.value)}
                size="small"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Audio Inputs"
                type="number"
                value={profileData.advanced?.audioInputs || '0'}
                onChange={(e) => handleNestedChange('advanced', 'audioInputs', e.target.value)}
                size="small"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Audio Outputs"
                type="number"
                value={profileData.advanced?.audioOutputs || '0'}
                onChange={(e) => handleNestedChange('advanced', 'audioOutputs', e.target.value)}
                size="small"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Hardware Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Hardware
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">Canvas</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Noise</Typography>
                  <Switch
                    checked={profileData.advanced?.canvas === 'noise'}
                    onChange={(e) => handleNestedChange('advanced', 'canvas', e.target.checked ? 'noise' : 'off')}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ ml: 1 }}>Off</Typography>
                  <Tooltip title="Canvas fingerprint protection">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">Client Rects</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Off</Typography>
                  <Switch
                    checked={profileData.advanced?.clientRects === 'off'}
                    onChange={(e) => handleNestedChange('advanced', 'clientRects', e.target.checked ? 'off' : 'on')}
                    size="small"
                  />
                  <Tooltip title="Client rects protection">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">Audio Context</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Noise</Typography>
                  <Switch
                    checked={profileData.advanced?.audioContext === 'off'}
                    onChange={(e) => handleNestedChange('advanced', 'audioContext', e.target.checked ? 'off' : 'noise')}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ ml: 1 }}>Off</Typography>
                  <Tooltip title="Audio context protection">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">WebGL Image</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Noise</Typography>
                  <Switch
                    checked={profileData.advanced?.webglImage === 'off'}
                    onChange={(e) => handleNestedChange('advanced', 'webglImage', e.target.checked ? 'off' : 'noise')}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ ml: 1 }}>Off</Typography>
                  <Tooltip title="WebGL image protection">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">WebGL Metadata</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Mask</Typography>
                  <Switch
                    checked={profileData.advanced?.webglMetadata === 'real'}
                    onChange={(e) => handleNestedChange('advanced', 'webglMetadata', e.target.checked ? 'real' : 'mask')}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ ml: 1 }}>Real</Typography>
                  <Tooltip title="WebGL metadata protection">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="WebGL Vendor"
                value={profileData.advanced?.webglVendor || 'Google Inc. (Intel)'}
                onChange={(e) => handleNestedChange('advanced', 'webglVendor', e.target.value)}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="WebGL Renderer"
                value={profileData.advanced?.webglRenderer || 'ANGLE (Mobile Intel(R) 4 Series Express Chipset Family)'}
                onChange={(e) => handleNestedChange('advanced', 'webglRenderer', e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Storage Options Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Storage Options
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2">Enable Local Storage</Typography>
                  <Tooltip title="Enable local storage persistence">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Switch
                  checked={profileData.advanced?.enableLocalStorage || false}
                  onChange={(e) => handleNestedChange('advanced', 'enableLocalStorage', e.target.checked)}
                  size="small"
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2">Enable IndexedDB</Typography>
                  <Tooltip title="Enable IndexedDB persistence">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Switch
                  checked={profileData.advanced?.enableIndexedDB || false}
                  onChange={(e) => handleNestedChange('advanced', 'enableIndexedDB', e.target.checked)}
                  size="small"
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2">Enable Extension storage</Typography>
                  <Tooltip title="Enable extension storage persistence">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Switch
                  checked={profileData.advanced?.enableExtensionStorage || false}
                  onChange={(e) => handleNestedChange('advanced', 'enableExtensionStorage', e.target.checked)}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Browser plugins Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Browser plugins
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2">Enable proprietary multimedia plugins</Typography>
              <Tooltip title="Enable multimedia plugins">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Switch
              checked={profileData.advanced?.enableMultimediaPlugins || false}
              onChange={(e) => handleNestedChange('advanced', 'enableMultimediaPlugins', e.target.checked)}
              size="small"
            />
          </Box>
        </Box>

        {/* Other Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Other
          </Typography>

          <Grid container spacing={2}>
            {[
              { key: 'activeSessionLock', label: 'Active session lock' },
              { key: 'enableGoogleServices', label: 'Enable Google services' },
              { key: 'enableBookmarkSaving', label: 'Enable browser bookmark saving' },
              { key: 'enableHistorySaving', label: 'Enable browser history saving' },
              { key: 'enablePasswordSaving', label: 'Enable password saving' },
              { key: 'enableSessionSaving', label: 'Enable session saving' },
              { key: 'enableSystemExtensions', label: 'Enable System Extensions' }
            ].map((setting) => (
              <Grid item xs={12} key={setting.key}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">{setting.label}</Typography>
                    <Tooltip title={`Toggle ${setting.label.toLowerCase()}`}>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Switch
                    checked={profileData.advanced?.[setting.key] || false}
                    onChange={(e) => handleNestedChange('advanced', setting.key, e.target.checked)}
                    size="small"
                  />
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Additional parameters..."
                value={profileData.advanced?.additionalParams || ''}
                onChange={(e) => handleNestedChange('advanced', 'additionalParams', e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">Create New Profile</Typography>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<ComputerIcon />} label="Overview" />
          <Tab icon={<PublicIcon />} label="Proxy" />
          <Tab icon={<NetworkCheckIcon />} label="WebRTC" />
          <Tab icon={<AccessTimeIcon />} label="Timezone" />
          <Tab icon={<LocationOnIcon />} label="Geolocation" />
          <Tab icon={<ExtensionIcon />} label="Extensions" />
          <Tab icon={<BookmarksIcon />} label="Bookmarks" />
          <Tab icon={<FingerprintIcon />} label="Fingerprint" />
          <Tab icon={<SettingsIcon />} label="Advanced" />
        </Tabs>
      </Box>
      
      <DialogContent>
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Profile Name"
                value={profileData.name}
                onChange={(e) => handleDirectChange('name', e.target.value)}
                required
                margin="normal"
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Operating System</InputLabel>
                <Select
                  value={profileData.os}
                  onChange={(e) => handleDirectChange('os', e.target.value)}
                  label="Operating System"
                >
                  <MenuItem value="Windows 10">Windows 10</MenuItem>
                  <MenuItem value="Windows 11">Windows 11</MenuItem>
                  <MenuItem value="macOS">macOS</MenuItem>
                  <MenuItem value="Linux">Linux</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Startup URL"
                value={profileData.startupUrl}
                onChange={(e) => handleDirectChange('startupUrl', e.target.value)}
                placeholder="https://example.com"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                border: '1px dashed #ccc', 
                p: 2, 
                borderRadius: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">Fingerprint</Typography>
                  <Tooltip title="Generate Random Fingerprint">
                    <IconButton onClick={generateRandomFingerprint}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  OS: {profileData.os}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  WebRTC: {profileData.webrtc.mode}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Canvas: {profileData.fingerprint.canvas}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  WebGL: {profileData.fingerprint.webgl}
                </Typography>
                
                <Box sx={{ flexGrow: 1 }} />
                
                <Typography variant="caption" color="text.secondary">
                  Click the refresh icon to generate a random fingerprint
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Proxy Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Proxy Settings</Typography>
              <FormControlLabel
                control={
                  <Switch 
                    checked={profileData.proxy.enabled}
                    onChange={(e) => handleChange('proxy', 'enabled', e.target.checked)}
                    color="primary"
                  />
                }
                label="Use Proxy"
                sx={{ m: 0 }}
              />
            </Box>
            
            {profileData.proxy.enabled && (
              <Box sx={{ 
                bgcolor: 'rgba(0, 0, 0, 0.02)', 
                borderRadius: 2, 
                p: 2, 
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Proxy Type</InputLabel>
                      <Select
                        value={profileData.proxy.type}
                        onChange={(e) => handleChange('proxy', 'type', e.target.value)}
                        label="Proxy Type"
                      >
                        <MenuItem value="http">HTTP</MenuItem>
                        <MenuItem value="https">HTTPS</MenuItem>
                        <MenuItem value="socks4">SOCKS4</MenuItem>
                        <MenuItem value="socks5">SOCKS5</MenuItem>
                        <MenuItem value="ssh">SSH</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="IP Address"
                      value={profileData.proxy.ip}
                      onChange={(e) => handleChange('proxy', 'ip', e.target.value)}
                      size="small"
                      placeholder="e.g., 192.168.1.1"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Port"
                      value={profileData.proxy.port}
                      onChange={(e) => handleChange('proxy', 'port', e.target.value)}
                      size="small"
                      placeholder="e.g., 8080"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={profileData.proxy.auth === 'userpass'}
                          onChange={(e) => handleChange('proxy', 'auth', e.target.checked ? 'userpass' : 'none')}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Use Authentication"
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={profileData.proxy.username || ''}
                      onChange={(e) => handleChange('proxy', 'username', e.target.value)}
                      size="small"
                      placeholder="Enter username"
                      disabled={profileData.proxy.auth !== 'userpass'}
                      sx={{
                        opacity: profileData.proxy.auth !== 'userpass' ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={profileData.proxy.password || ''}
                      onChange={(e) => handleChange('proxy', 'password', e.target.value)}
                      size="small"
                      placeholder="Enter password"
                      disabled={profileData.proxy.auth !== 'userpass'}
                      sx={{
                        opacity: profileData.proxy.auth !== 'userpass' ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Additional Settings
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={profileData.proxy.rotateUserAgent || false}
                          onChange={(e) => handleChange('proxy', 'rotateUserAgent', e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Rotate User-Agent"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={profileData.proxy.autoRotate || false}
                          onChange={(e) => handleChange('proxy', 'autoRotate', e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Auto-Rotate Proxy"
                    />
                  </Grid>
                  
                  {profileData.proxy.autoRotate && (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Rotation Interval</InputLabel>
                        <Select
                          value={profileData.proxy.rotationInterval || '1h'}
                          onChange={(e) => handleChange('proxy', 'rotationInterval', e.target.value)}
                          label="Rotation Interval"
                        >
                          <MenuItem value="30m">Every 30 minutes</MenuItem>
                          <MenuItem value="1h">Every hour</MenuItem>
                          <MenuItem value="6h">Every 6 hours</MenuItem>
                          <MenuItem value="12h">Every 12 hours</MenuItem>
                          <MenuItem value="24h">Every 24 hours</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          // In a real app, this would test the proxy
                          alert('Testing proxy connection...');
                        }}
                        disabled={!profileData.proxy.ip || !profileData.proxy.port}
                      >
                        Test Proxy
                      </Button>
                      
                      <Button 
                        variant="outlined"
                        startIcon={<PublicIcon />}
                        onClick={() => {
                          // In a real app, this would find free proxies
                          alert('Finding free proxies...');
                        }}
                      >
                        Find Free Proxies
                      </Button>
                      
                      <Button 
                        variant="outlined"
                        color="secondary"
                        startIcon={isLoadingProxy ? <CircularProgress size={16} /> : <UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoadingProxy}
                        sx={{ borderColor: 'rgba(0, 0, 0, 0.23)' }}
                      >
                        {isLoadingProxy ? 'Processing...' : 'Upload Proxy'}
                      </Button>
                      
                      {/* Hidden file input for proxy upload */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".txt,.csv,.json"
                      />
                    </Box>
                  </Grid>
                </Grid>
                
                {/* Proxy Status Display */}
                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  bgcolor: 'rgba(25, 118, 210, 0.05)', 
                  borderRadius: 1,
                  border: '1px solid rgba(25, 118, 210, 0.1)'
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Proxy Status
                  </Typography>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Status</Typography>
                      <Chip 
                        label={profileData.proxy.isAlive ? "Active" : profileData.proxy.ip ? "Not Tested" : "Not Configured"} 
                        size="small" 
                        color={profileData.proxy.isAlive ? "success" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>IP Location</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        {profileData.proxy.countryCode && (
                          <img 
                            src={`https://flagcdn.com/w20/${profileData.proxy.countryCode.toLowerCase()}.png`}
                            alt={profileData.proxy.country || 'Unknown'}
                            style={{ width: 20, height: 15, marginRight: 8 }}
                          />
                        )}
                        <Typography variant="body2">
                          {profileData.proxy.country ? 
                            `${profileData.proxy.country}${profileData.proxy.city ? `, ${profileData.proxy.city}` : ''}` : 
                            'Unknown'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Speed</Typography>
                      <Typography variant="body2">
                        {profileData.proxy.timeout ? `${profileData.proxy.timeout} ms` : 'Not tested'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Provider</Typography>
                      <Typography variant="body2" sx={{ 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {profileData.proxy.isp || 'Unknown'}
                      </Typography>
                    </Grid>
                    
                    {profileData.proxy.timezone && (
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Timezone</Typography>
                        <Typography variant="body2">{profileData.proxy.timezone}</Typography>
                      </Grid>
                    )}
                    
                    {(profileData.proxy.lat && profileData.proxy.lon) && (
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Coordinates</Typography>
                        <Typography variant="body2">{profileData.proxy.lat}, {profileData.proxy.lon}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Note: Using a proxy helps prevent detection by websites. Make sure your proxy location matches your timezone and geolocation settings.
                  </Typography>
                </Box>
              </Box>
            )}
            
            {!profileData.proxy.enabled && (
              <Box sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: 'rgba(0, 0, 0, 0.02)', 
                borderRadius: 2,
                border: '1px dashed rgba(0, 0, 0, 0.1)'
              }}>
                <PublicIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  No proxy configured
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your real IP address will be used for this profile. Enable proxy to hide your IP and prevent detection.
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
        
        {/* WebRTC Tab */}
        <TabPanel value={tabValue} index={2}>
          {renderWebRTCTab()}
        </TabPanel>
        
        {/* Timezone Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Timezone Settings</Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.timezone.useProxyTimezone}
                    onChange={(e) => handleUseProxyTimezone(e.target.checked)}
                    color="primary"
                  />
                }
                label="Use Timezone from IP"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Automatically sets the timezone based on the proxy's IP location. Ensures your browser fingerprint matches your IP.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={profileData.timezone.useProxyTimezone}>
                <InputLabel id="timezone-select-label">Manual Timezone</InputLabel>
                <Select
                  labelId="timezone-select-label"
                  value={profileData.timezone.manualTimezone}
                  label="Manual Timezone"
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                >
                  <MenuItem value="America/New_York">New York (EST)</MenuItem>
                  <MenuItem value="America/Chicago">Chicago (CST)</MenuItem>
                  <MenuItem value="America/Denver">Denver (MST)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Los Angeles (PST)</MenuItem>
                  <MenuItem value="Europe/London">London (GMT)</MenuItem>
                  <MenuItem value="Europe/Berlin">Berlin (CET)</MenuItem>
                  <MenuItem value="Europe/Moscow">Moscow (MSK)</MenuItem>
                  <MenuItem value="Asia/Tokyo">Tokyo (JST)</MenuItem>
                  <MenuItem value="Asia/Shanghai">Shanghai (CST)</MenuItem>
                  <MenuItem value="Australia/Sydney">Sydney (AEST)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                bgcolor: 'background.paper',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  GMT Offset
                </Typography>
                <Typography variant="h6" color={profileData.timezone.useProxyTimezone ? 'text.secondary' : 'text.primary'}>
                  {profileData.timezone.useProxyTimezone 
                    ? 'Will be determined by proxy IP' 
                    : profileData.timezone.gmtOffset || getGMTOffset(profileData.timezone.manualTimezone)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {profileData.timezone.useProxyTimezone 
                    ? 'The system will adjust for Daylight Saving Time (DST) based on the proxy location.' 
                    : 'DST will be applied according to the selected timezone rules.'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Why is timezone important?</AlertTitle>
                If your IP address is from one country but your browser timezone is set to another, websites may detect this mismatch and flag your activity as suspicious. Keeping the timezone consistent with your proxy makes your browser fingerprint more natural.
              </Alert>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                  Additional Settings
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={profileData.timezone.fillBasedOnIp || false}
                          onChange={(e) => handleChange('timezone', 'fillBasedOnIp', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Fill Based on IP</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Use geolocation data to automatically set timezone when proxy location changes
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={profileData.timezone.dontChangeTime || false}
                          onChange={(e) => handleChange('timezone', 'dontChangeTime', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Don't Change Time</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Keep system time instead of adjusting to the selected timezone
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={profileData.timezone.autoSync || false}
                          onChange={(e) => handleChange('timezone', 'autoSync', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Auto-Sync with Proxy</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Automatically update timezone when proxy location changes
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {profileData.proxy?.enabled && profileData.timezone?.useProxyTimezone && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<AccessTimeIcon />}>
                  <AlertTitle>Proxy Timezone Detection</AlertTitle>
                  {profileData.proxy.timezone ? (
                    <>Your timezone will be automatically set to match your proxy location: <strong>{profileData.proxy.timezone}</strong></>
                  ) : (
                    'Timezone will be automatically detected from your proxy IP when connected.'
                  )}
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        {/* Geolocation Tab */}
        <TabPanel value={tabValue} index={4}>
          {renderGeolocationTab()}
        </TabPanel>
        
        {/* Extensions Tab */}
        <TabPanel value={tabValue} index={5}>
          {renderExtensionsTab()}
        </TabPanel>
        
        {/* Bookmarks Tab */}
        <TabPanel value={tabValue} index={6}>
          {renderBookmarksTab()}
        </TabPanel>
        
        {/* Fingerprint Tab */}
        <TabPanel value={tabValue} index={7}>
          {renderFingerprintTab()}
        </TabPanel>
        
        {/* Advanced Tab */}
        <TabPanel value={tabValue} index={8}>
          {renderAdvancedTab()}
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
        >
          Create Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
} 