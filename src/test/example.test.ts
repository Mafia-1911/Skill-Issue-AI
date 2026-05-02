import React from "react";
import { beforeEach, describe, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
