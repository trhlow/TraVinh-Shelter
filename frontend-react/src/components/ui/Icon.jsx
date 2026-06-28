import {
  Home, Building, Building2, Mountain, Search, MapPin, Maximize2,
  Bed, Bath, ChevronRight, ChevronDown, User, ShieldCheck,
  LayoutDashboard, Plus, IdCard, SlidersHorizontal, Sun, Moon,
  Youtube, Facebook, Twitter, Instagram, Linkedin, Ruler,
  Pencil, X, Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image, FileText,
  AlertCircle, CheckCircle, Info, Clock, Filter, Grid,
  List, ChevronLeft, MoreHorizontal, LogOut, Settings,
  TrendingUp, Users, DollarSign, BarChart3, Crop,
} from 'lucide-react';

const ICON_MAP = {
  Home, Building, Building2, Mountain, Search, MapPin,
  Maximize2, Bed, Bath, ChevronRight, ChevronDown,
  User, ShieldCheck, LayoutDashboard, Plus, IdCard,
  SlidersHorizontal, Sun, Moon, Youtube, Facebook,
  Twitter, Instagram, Linkedin, Ruler, Pencil, X,
  Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image,
  FileText, AlertCircle, CheckCircle, Info, Clock,
  Filter, Grid, List, ChevronLeft, MoreHorizontal,
  LogOut, Settings, TrendingUp, Users, DollarSign,
  BarChart3, Crop,
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} className={className} strokeWidth={strokeWidth} />;
}
