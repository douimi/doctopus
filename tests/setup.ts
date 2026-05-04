import { config as loadDotenv } from 'dotenv';
import '@testing-library/jest-dom';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });
