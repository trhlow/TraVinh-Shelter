import {
  Home, Building, Building2, Mountain, Search, MapPin, Maximize2,
  Bed, Bath, ChevronRight, ChevronDown, User, ShieldCheck,
  LayoutDashboard, Plus, IdCard, SlidersHorizontal, Sun, Moon,
  Youtube, Facebook, Twitter, Instagram, Linkedin, Ruler, Castle,
  Pencil, X, Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image, FileText, Headphones, Tag,
  AlertCircle, CheckCircle, Info, Clock, Filter, Grid,
  List, ChevronLeft, MoreHorizontal, LogOut, Settings,
  TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Crop, Lock,
  Zap, Droplets, Wrench, Car, Wifi, Thermometer, Coffee, Package,
  Wind, BedDouble, Calendar, Users2, Bike, Dog, CalendarCheck,
  PawPrint, Refrigerator, AirVent, WashingMachine, Utensils,
  ShowerHead, Layers, Sofa, Tv, Sparkles,
  LayoutGrid, Wallet, Map, MessageCircle, Bell, ScrollText, Key,
} from 'lucide-react';

const ICON_MAP = {
  Home, Building, Building2, Mountain, Search, MapPin,
  Maximize2, Bed, Bath, ChevronRight, ChevronDown,
  User, ShieldCheck, LayoutDashboard, Plus, IdCard,
  SlidersHorizontal, Sun, Moon, Youtube, Facebook,
  Twitter, Instagram, Linkedin, Ruler, Castle, Pencil, X,
  Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image, Headphones, Tag,
  FileText, AlertCircle, CheckCircle, Info, Clock,
  Filter, Grid, List, ChevronLeft, MoreHorizontal,
  LogOut, Settings, TrendingUp, TrendingDown, Users, DollarSign,
  BarChart3, Crop, Lock,
  Zap, Droplets, Wrench, Car, Wifi, Thermometer, Coffee, Package,
  Wind, BedDouble, Calendar, Users2, Bike, Dog, CalendarCheck,
  PawPrint, Refrigerator, AirVent, WashingMachine, Utensils,
  ShowerHead, Layers, Sofa, Tv, Sparkles,
  LayoutGrid, Wallet, Map, MessageCircle, Bell, ScrollText, Key,
};

// lucide-react has no TikTok mark — hand-drawn to match the surrounding lucide
// icons' size/stroke weight (currentColor so it themes automatically).
function TikTokIcon({ size, className, strokeWidth }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  if (name === 'TikTok') {
    return <TikTokIcon size={size} className={className} strokeWidth={strokeWidth} />;
  }
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} className={className} strokeWidth={strokeWidth} />;
}
